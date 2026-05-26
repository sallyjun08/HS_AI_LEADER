import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/lib/auth-context";
import DashboardLayout from "@/components/DashboardLayout";

// ─── 타입 ──────────────────────────────────────────────────────────────────

type LectureTimeSlot = {
  date?: string;
  start?: string;
  startTime?: string;
  end?: string;
  endTime?: string;
  day?: string;
};

type MatchInfo = {
  id: string;
  title: string;
  start_date: string;
  address: string | null;
  participant_count: number;
  category: string;
  lecture_type: "oneday" | "intensive" | "longterm" | null;
  session_count: number | null;
  lecture_times: LectureTimeSlot[] | null;
  client: { name: string } | null;
};

type PhotoSlot = {
  file: File;
  previewUrl: string;
  status: "uploading" | "done" | "error";
  publicUrl?: string;
};

// ─── 헬퍼 ──────────────────────────────────────────────────────────────────

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── 메인 ──────────────────────────────────────────────────────────────────

export default function ReportPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const matchId    = router.query.matchId   as string | undefined;
  const resubmitId = router.query.resubmit  as string | undefined; // 재작성할 보고서 ID

  const [match, setMatch] = useState<MatchInfo | null>(null);
  const [fetching, setFetching] = useState(true);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  // Form fields
  const [lectureDate, setLectureDate] = useState(todayIso());
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [attendeeCount, setAttendeeCount] = useState("");
  const [reportText, setReportText] = useState("");

  // Photos — 3 slots
  const [photos, setPhotos] = useState<(PhotoSlot | null)[]>([null, null, null]);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── 인증 가드 ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (!loading && (!user || user.role !== "leader")) router.replace("/login");
  }, [loading, user, router]);

  // ── 매칭 정보 불러오기 ─────────────────────────────────────────────────

  useEffect(() => {
    if (!user || !matchId) return;
    fetch("/api/match-requests")
      .then((r) => r.json())
      .then((data: MatchInfo[]) => {
        if (Array.isArray(data)) {
          const found = data.find((m) => m.id === matchId);
          setMatch(found ?? null);
          // 집중코스형: lecture_times의 모든 날짜를 기본 선택
          if (found?.lecture_type === "intensive" && found.lecture_times) {
            const dates = found.lecture_times
              .map((s) => s.date)
              .filter((d): d is string => !!d)
              .sort();
            setSelectedDates(dates);
          }
        }
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [user, matchId]);

  // ── 재작성: 기존 보고서 내용 불러오기 ────────────────────────────────────

  useEffect(() => {
    if (!user || !resubmitId) return;
    fetch("/api/activity-reports")
      .then((r) => r.json())
      .then((data: Array<{
        id: string; lecture_date: string; lecture_dates: string[];
        attendance_count: number; report_text: string | null;
        client_rejection_reason: string | null;
      }>) => {
        if (!Array.isArray(data)) return;
        const existing = data.find((r) => r.id === resubmitId);
        if (!existing) return;
        setRejectionReason(existing.client_rejection_reason);
        setLectureDate(existing.lecture_date ?? todayIso());
        if (existing.lecture_dates?.length > 0) setSelectedDates(existing.lecture_dates);
        setAttendeeCount(String(existing.attendance_count));
        setReportText(existing.report_text ?? "");
      })
      .catch(() => {});
  }, [user, resubmitId]);

  // ── 사진 업로드 ────────────────────────────────────────────────────────

  async function handleFileSelect(slotIndex: number, file: File) {
    if (!file.type.startsWith("image/")) return;

    const previewUrl = URL.createObjectURL(file);
    setPhotos((prev) => {
      const next = [...prev];
      next[slotIndex] = { file, previewUrl, status: "uploading" };
      return next;
    });

    try {
      // 1. 서버에서 서명된 업로드 URL 발급
      const urlRes = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      if (!urlRes.ok) throw new Error("업로드 URL 발급 실패");
      const { signedUrl, publicUrl } = await urlRes.json() as { signedUrl: string; publicUrl: string };

      // 2. 스토리지에 직접 PUT 업로드
      const uploadRes = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("파일 업로드 실패");

      setPhotos((prev) => {
        const next = [...prev];
        next[slotIndex] = { file, previewUrl, status: "done", publicUrl };
        return next;
      });
    } catch {
      setPhotos((prev) => {
        const next = [...prev];
        if (next[slotIndex]) next[slotIndex] = { ...next[slotIndex]!, status: "error" };
        return next;
      });
    }
  }

  function removePhoto(slotIndex: number) {
    const slot = photos[slotIndex];
    if (slot) URL.revokeObjectURL(slot.previewUrl);
    setPhotos((prev) => {
      const next = [...prev];
      next[slotIndex] = null;
      return next;
    });
    if (inputRefs[slotIndex].current) inputRefs[slotIndex].current!.value = "";
  }

  // ── 제출 ──────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    if (!matchId) return;
    if (!attendeeCount || Number(attendeeCount) < 1) {
      setSubmitError("교육 인원 수를 입력해 주세요.");
      return;
    }
    if (!reportText.trim()) {
      setSubmitError("교육 내용 요약을 입력해 주세요.");
      return;
    }
    const isIntensive = match?.lecture_type === "intensive";
    if (isIntensive && selectedDates.length === 0) {
      setSubmitError("강의 날짜를 하나 이상 선택해 주세요.");
      return;
    }
    const uploading = photos.some((p) => p?.status === "uploading");
    if (uploading) {
      setSubmitError("사진 업로드가 완료될 때까지 기다려 주세요.");
      return;
    }

    const imageUrls = photos
      .filter((p): p is PhotoSlot => p?.status === "done" && !!p.publicUrl)
      .map((p) => p.publicUrl!);

    setSubmitting(true);
    try {
      const commonBody = isIntensive
        ? { lectureDates: selectedDates, attendeeCount: Number(attendeeCount), reportText: reportText.trim(), imageUrls }
        : { lectureDate, attendeeCount: Number(attendeeCount), reportText: reportText.trim(), imageUrls };

      const url    = resubmitId ? `/api/activity-reports/${resubmitId}/resubmit` : "/api/activity-reports";
      const method = resubmitId ? "PATCH" : "POST";
      const body   = resubmitId ? commonBody : { ...commonBody, matchId };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "제출에 실패했습니다.");
      }

      router.replace("/dashboard/leader?reportSuccess=1");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "오류가 발생했습니다.");
      setSubmitting(false);
    }
  }

  // ── 로딩 / 에러 ─────────────────────────────────────────────────────

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-hwaseong-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pendingUpload = photos.some((p) => p?.status === "uploading");
  const filledSlots = photos.filter(Boolean).length;
  const isIntensive = match?.lecture_type === "intensive";
  const canSubmit =
    !submitting && !pendingUpload && attendeeCount && reportText.trim() &&
    (!isIntensive || selectedDates.length > 0);

  return (
    <>
      <Head><title>활동 보고서 제출 | 화성 AI 시민리더 잇다</title></Head>
      <DashboardLayout pageTitle="활동 보고서 제출">

        {/* 헤더 */}
        <div className="bg-gradient-to-br from-hwaseong-blue to-indigo-700 rounded-3xl p-5">
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => router.back()}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors flex-shrink-0"
            >
              ←
            </button>
            <span className="text-white/70 text-xs font-semibold">활동 보고서 제출</span>
          </div>

          {fetching ? (
            <div className="h-6 w-48 bg-white/20 rounded-lg animate-pulse mt-2" />
          ) : match ? (
            <div className="mt-2 space-y-0.5">
              <h2 className="font-black text-white text-lg leading-snug">{match.title}</h2>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-blue-200 text-xs">
                <span>🏢 {match.client?.name}</span>
                {match.address && <span>📍 {match.address}</span>}
                <span>📅 {match.start_date}</span>
                <span>👥 예정 {match.participant_count}명</span>
              </div>
            </div>
          ) : (
            <p className="text-white/60 text-sm mt-2">강의를 불러오는 중...</p>
          )}
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ── 반려 사유 안내 (재작성 모드에서만) ── */}
          {rejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-start gap-3">
              <span className="text-red-500 text-base flex-shrink-0 mt-0.5">↩</span>
              <div>
                <p className="text-xs font-bold text-red-700 mb-0.5">수요처 반려 사유</p>
                <p className="text-sm text-red-600 leading-relaxed">"{rejectionReason}"</p>
              </div>
            </div>
          )}

          {/* ── 기본 정보 ── */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 space-y-4">
            <h3 className="font-bold text-hwaseong-text text-sm flex items-center gap-2">
              <span className="w-6 h-6 bg-hwaseong-blue text-white text-xs font-black rounded-lg flex items-center justify-center">1</span>
              기본 정보
            </h3>

            {/* 강의 날짜 — 집중코스형: 다중 선택 / 그 외: 단일 날짜 */}
            {isIntensive ? (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-600">
                    강의 날짜 선택 <span className="text-red-400">*</span>
                    <span className="ml-1.5 text-gray-400 font-normal">해당하는 날짜를 모두 선택하세요</span>
                  </label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const allDates = (match?.lecture_times ?? [])
                          .map((s) => s.date).filter((d): d is string => !!d).sort();
                        setSelectedDates(allDates);
                      }}
                      className="text-[10px] font-bold px-2 py-1 bg-hwaseong-blue/10 text-hwaseong-blue rounded-lg hover:bg-hwaseong-blue/20 transition-colors"
                    >
                      전체 선택
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDates([])}
                      className="text-[10px] font-bold px-2 py-1 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      전체 해제
                    </button>
                  </div>
                </div>
                {fetching ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : (match?.lecture_times ?? []).filter((s) => s.date).length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">등록된 강의 날짜가 없습니다. 직접 날짜를 입력해 주세요.</p>
                ) : (
                  <div className="space-y-2">
                    {(match!.lecture_times ?? [])
                      .filter((s) => s.date)
                      .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))
                      .map((slot, idx) => {
                        const date = slot.date!;
                        const checked = selectedDates.includes(date);
                        const timeStr = slot.start ?? slot.startTime ?? "";
                        return (
                          <label
                            key={idx}
                            className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 cursor-pointer transition-all ${
                              checked
                                ? "border-hwaseong-blue bg-blue-50"
                                : "border-gray-200 bg-gray-50 hover:border-gray-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                setSelectedDates((prev) =>
                                  e.target.checked ? [...prev, date].sort() : prev.filter((d) => d !== date)
                                );
                              }}
                              className="w-4 h-4 accent-hwaseong-blue flex-shrink-0"
                            />
                            <span className={`text-sm font-semibold flex-1 ${checked ? "text-hwaseong-blue" : "text-gray-600"}`}>
                              {idx + 1}일차
                              <span className="ml-2 font-normal text-xs text-gray-500">
                                {new Date(date).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })}
                                {timeStr && ` · ${timeStr}`}
                              </span>
                            </span>
                            {checked && (
                              <svg className="w-4 h-4 text-hwaseong-blue flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </label>
                        );
                      })}
                  </div>
                )}
                <p className="text-[11px] text-gray-400 mt-1.5">
                  {selectedDates.length > 0
                    ? `${selectedDates.length}일 선택됨`
                    : "날짜를 선택해 주세요."}
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  실제 강의 날짜 <span className="text-red-400">*</span>
                  <span className="ml-1.5 text-gray-400 font-normal">(오늘 날짜 자동 입력)</span>
                </label>
                <input
                  type="date"
                  value={lectureDate}
                  max={todayIso()}
                  onChange={(e) => setLectureDate(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30 bg-white"
                />
              </div>
            )}

            {/* 교육 인원 */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                최종 교육 인원 <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="9999"
                  value={attendeeCount}
                  onChange={(e) => setAttendeeCount(e.target.value)}
                  placeholder="0"
                  required
                  inputMode="numeric"
                  className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30 pr-10"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">명</span>
              </div>
              {match && attendeeCount && (
                <p className={`text-[11px] mt-1 ${Number(attendeeCount) > match.participant_count * 1.2 ? "text-amber-600" : "text-gray-400"}`}>
                  예정 인원 {match.participant_count}명 대비 {Number(attendeeCount) > match.participant_count ? `+${Number(attendeeCount) - match.participant_count}명` : `${attendeeCount}명`}
                </p>
              )}
            </div>
          </div>

          {/* ── 교육 내용 요약 ── */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 space-y-3">
            <h3 className="font-bold text-hwaseong-text text-sm flex items-center gap-2">
              <span className="w-6 h-6 bg-hwaseong-blue text-white text-xs font-black rounded-lg flex items-center justify-center">2</span>
              교육 내용 요약
            </h3>
            <textarea
              rows={5}
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              placeholder={"오늘 강의에서 다룬 주요 내용을 작성해 주세요.\n\n예시:\n- AI 기초 개념 소개 (생성형 AI, LLM)\n- ChatGPT 실습 (프롬프트 작성법)\n- 수강생 질의응답 및 피드백"}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30 resize-none leading-relaxed"
            />
            <div className="flex justify-between items-center">
              <p className="text-[11px] text-gray-400">관리자 검토 후 정산에 활용됩니다.</p>
              <span className={`text-[11px] font-semibold ${reportText.length > 500 ? "text-amber-600" : "text-gray-300"}`}>
                {reportText.length}자
              </span>
            </div>
          </div>

          {/* ── 현장 사진 업로드 ── */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-hwaseong-text text-sm flex items-center gap-2">
                <span className="w-6 h-6 bg-hwaseong-blue text-white text-xs font-black rounded-lg flex items-center justify-center">3</span>
                현장 사진
              </h3>
              <span className="text-[11px] text-gray-400">{filledSlots} / 3장</span>
            </div>

            <p className="text-xs text-gray-500 bg-blue-50 rounded-xl px-3 py-2.5">
              📱 모바일에서 촬영하면 카메라 앱으로 바로 연결됩니다. 수강생 동의 후 촬영해 주세요.
            </p>

            {/* 사진 슬롯 3개 */}
            <div className="grid grid-cols-3 gap-3">
              {photos.map((slot, idx) => (
                <PhotoSlotUI
                  key={idx}
                  slot={slot}
                  inputRef={inputRefs[idx]}
                  label={idx === 0 ? "메인" : `사진 ${idx + 1}`}
                  onSelect={(file) => handleFileSelect(idx, file)}
                  onRemove={() => removePhoto(idx)}
                />
              ))}
            </div>

            <p className="text-[11px] text-gray-400 text-center">
              JPG · PNG · HEIC 지원 · 각 파일 최대 10MB
            </p>
          </div>

          {/* ── 에러 메시지 ── */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center gap-2">
              <span className="text-red-500 flex-shrink-0">⚠️</span>
              <p className="text-sm text-red-700 font-medium">{submitError}</p>
            </div>
          )}

          {/* ── 제출 버튼 ── */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-4 bg-hwaseong-blue text-white font-black text-base rounded-2xl hover:bg-blue-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-hwaseong-blue/20"
          >
            {submitting ? (
              <><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> 제출 중...</>
            ) : pendingUpload ? (
              <><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> 사진 업로드 중...</>
            ) : (
              <>📤 보고서 제출하기</>
            )}
          </button>

          <p className="text-center text-xs text-gray-400 pb-4">
            제출 후 수정이 불가합니다. 내용을 다시 확인해 주세요.
          </p>

        </form>
      </DashboardLayout>
    </>
  );
}

// ─── 사진 슬롯 컴포넌트 ─────────────────────────────────────────────────────

function PhotoSlotUI({
  slot,
  inputRef,
  label,
  onSelect,
  onRemove,
}: {
  slot: PhotoSlot | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  label: string;
  onSelect: (file: File) => void;
  onRemove: () => void;
}) {
  return (
    <div className="relative aspect-square">
      {/* 숨겨진 파일 입력 — accept="image/*" 으로 모바일에서 카메라/갤러리 선택 가능 */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onSelect(file);
        }}
      />

      {slot === null ? (
        /* 빈 슬롯 — 탭하면 파일 선택 */
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full h-full rounded-2xl border-2 border-dashed border-gray-200 hover:border-hwaseong-blue/50 hover:bg-blue-50/30 transition-all flex flex-col items-center justify-center gap-1.5 bg-gray-50 group"
        >
          <span className="text-2xl group-hover:scale-110 transition-transform">📷</span>
          <span className="text-[10px] font-bold text-gray-400 group-hover:text-hwaseong-blue">{label}</span>
        </button>
      ) : slot.status === "uploading" ? (
        /* 업로드 중 */
        <div className="w-full h-full rounded-2xl overflow-hidden bg-gray-100 relative">
          <img src={slot.previewUrl} alt="" className="w-full h-full object-cover opacity-50" />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/20">
            <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] text-white font-bold">업로드 중</span>
          </div>
        </div>
      ) : slot.status === "error" ? (
        /* 업로드 실패 */
        <div className="w-full h-full rounded-2xl overflow-hidden bg-red-50 border-2 border-red-200 flex flex-col items-center justify-center gap-2">
          <span className="text-2xl">❌</span>
          <span className="text-[10px] text-red-600 font-bold text-center px-2">업로드 실패</span>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-[10px] text-red-500 underline"
          >
            다시 시도
          </button>
        </div>
      ) : (
        /* 업로드 완료 — 미리보기 */
        <div className="w-full h-full rounded-2xl overflow-hidden relative group">
          <img
            src={slot.previewUrl}
            alt="현장 사진"
            className="w-full h-full object-cover"
          />
          {/* 완료 뱃지 */}
          <div className="absolute top-1.5 left-1.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          {/* 삭제 버튼 */}
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white text-[10px] transition-colors"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
