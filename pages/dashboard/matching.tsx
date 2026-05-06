import Head from "next/head";
import dynamic from "next/dynamic";
import { useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { MOCK_MATCH_REQUESTS } from "@/lib/mock-data";
import type { MapMarker } from "@/components/MatchingMap";

/* ── 지도 컴포넌트 (SSR 비활성화) ──────────────────────────── */
const MatchingMap = dynamic(() => import("@/components/MatchingMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-hwaseong-gray rounded-xl">
      <div className="text-center text-gray-400">
        <div className="text-3xl mb-2">🗺️</div>
        <p className="text-sm">지도 불러오는 중…</p>
      </div>
    </div>
  ),
});

/* ── 강의 요청 위도·경도 ─────────────────────────────────────── */
const COORDS: Record<string, { lat: number; lng: number }> = {
  m1: { lat: 37.2066, lng: 127.0712 }, // 동탄초등학교
  m2: { lat: 37.0693, lng: 126.9018 }, // 노인복지관 봉담
  m3: { lat: 37.0759, lng: 126.8542 }, // 화성테크 향남
  m4: { lat: 37.1997, lng: 126.9800 }, // 시청
};

const STATUS_STYLE: Record<string, string> = {
  pending:   "bg-blue-100 text-blue-700",
  matched:   "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-500",
};
const STATUS_KR: Record<string, string> = {
  pending:   "신청 대기",
  matched:   "수락 완료",
  completed: "강의 완료",
};

/* ── 별 입력 컴포넌트 ─────────────────────────────────────── */
function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          className="text-2xl leading-none transition-transform active:scale-90"
        >
          <span className={(hover || value) >= s ? "text-amber-400" : "text-gray-200"}>★</span>
        </button>
      ))}
    </div>
  );
}

/* ── 메인 ─────────────────────────────────────────────────── */
export default function MatchingDashboard() {
  /* 요청 수락/거절 상태 */
  const [requestState, setRequestState] = useState<Record<string, "idle" | "accepted" | "declined">>(
    Object.fromEntries(MOCK_MATCH_REQUESTS.map((r) => [r.id, "idle"]))
  );

  /* 보고서 폼 상태 */
  const [reportForm, setReportForm] = useState({
    requestId: "",
    rating: 0,
    attendees: "",
    note: "",
  });
  const [photos, setPhotos]         = useState<{ file: File; url: string }[]>([]);
  const [submitted, setSubmitted]   = useState(false);
  const fileInputRef                = useRef<HTMLInputElement>(null);

  /* 지도 마커 */
  const mapMarkers: MapMarker[] = MOCK_MATCH_REQUESTS.map((r) => ({
    id:     r.id,
    org:    r.requester_org,
    title:  r.theme,
    lat:    COORDS[r.id]?.lat ?? 37.1997,
    lng:    COORDS[r.id]?.lng ?? 126.98,
    status: r.status === "matched" ? "matched" : r.status === "completed" ? "completed" : "pending",
  }));

  /* 새 요청 건수 */
  const newCount = MOCK_MATCH_REQUESTS.filter(
    (r) => r.status === "pending" && requestState[r.id] === "idle"
  ).length;

  /* 사진 선택 */
  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 3 - photos.length);
    const items = files.map((f) => ({ file: f, url: URL.createObjectURL(f) }));
    setPhotos((p) => [...p, ...items].slice(0, 3));
    e.target.value = "";
  }

  function removePhoto(idx: number) {
    setPhotos((p) => {
      URL.revokeObjectURL(p[idx].url);
      return p.filter((_, i) => i !== idx);
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <>
      <Head>
        <title>스마트 매칭 대시보드 | 화성 AI 리더 허브</title>
      </Head>

      <DashboardLayout role="instructor" userName="박준호" pageTitle="스마트 매칭 대시보드">

        {/* ══ 알림 배너 ══════════════════════════════════════ */}
        {newCount > 0 && (
          <div className="bg-gradient-to-r from-hwaseong-blue to-hwaseong-skyblue rounded-2xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
              🔔
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-sm">
                새로운 강의 요청 {newCount}건이 도착했습니다
              </p>
              <p className="text-blue-200 text-xs mt-0.5">
                아래에서 수락 또는 거절을 선택해 주세요
              </p>
            </div>
            <span className="bg-red-500 text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
              {newCount}
            </span>
          </div>
        )}

        {/* ══ 강의 요청 카드 ═════════════════════════════════ */}
        <section id="requests">
          <h2 className="font-bold text-hwaseong-text text-lg mb-4">강의 요청 목록</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MOCK_MATCH_REQUESTS.map((r) => {
              const state  = requestState[r.id];
              const isNew  = r.status === "pending" && state === "idle";
              const accept = state === "accepted";
              const decline = state === "declined";

              return (
                <div
                  key={r.id}
                  className={`bg-white rounded-2xl border shadow-sm transition-all ${
                    accept  ? "border-green-300 ring-1 ring-green-200" :
                    decline ? "border-gray-200 opacity-60" :
                    isNew   ? "border-blue-200 ring-1 ring-blue-100" :
                              "border-gray-100"
                  }`}
                >
                  <div className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <p className="font-bold text-hwaseong-text text-sm leading-snug">{r.requester_org}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{r.theme}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
                        accept  ? "bg-green-100 text-green-700" :
                        decline ? "bg-gray-100 text-gray-400"   :
                        STATUS_STYLE[r.status] ?? "bg-gray-100 text-gray-500"
                      }`}>
                        {accept ? "수락 완료" : decline ? "거절됨" : STATUS_KR[r.status] ?? r.status}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="space-y-1 text-xs text-gray-500 mb-4">
                      <div className="flex gap-2"><span>📅</span><span>{r.preferred_date}</span></div>
                      <div className="flex gap-2"><span>📍</span><span>{r.location}</span></div>
                      <div className="flex gap-2"><span>👥</span><span>예상 인원 {r.audience_size}명</span></div>
                      <div className="flex gap-2"><span>🙋</span><span>요청자: {r.requester_name}</span></div>
                    </div>

                    {/* Actions */}
                    {isNew && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setRequestState((p) => ({ ...p, [r.id]: "accepted" }))}
                          className="flex-1 py-2 bg-hwaseong-blue text-white rounded-xl text-xs font-bold hover:bg-blue-900 transition-colors active:scale-95"
                        >
                          ✓ 수락하기
                        </button>
                        <button
                          onClick={() => setRequestState((p) => ({ ...p, [r.id]: "declined" }))}
                          className="flex-1 py-2 border border-gray-200 text-gray-500 rounded-xl text-xs font-medium hover:bg-gray-50 transition-colors"
                        >
                          ✕ 거절
                        </button>
                      </div>
                    )}
                    {accept && (
                      <div className="flex items-center gap-2 bg-green-50 rounded-xl px-3 py-2">
                        <span className="text-green-600 text-sm">✓</span>
                        <p className="text-xs text-green-700 font-medium">수락 완료 — 담당자가 일정을 확정합니다</p>
                      </div>
                    )}
                    {decline && (
                      <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                        <p className="text-xs text-gray-400">거절 처리되었습니다</p>
                      </div>
                    )}
                    {r.status === "matched" && state === "idle" && (
                      <div className="flex items-center gap-2 bg-green-50 rounded-xl px-3 py-2">
                        <p className="text-xs text-green-700 font-medium">✓ 이미 매칭 완료된 요청입니다</p>
                      </div>
                    )}
                    {r.status === "completed" && state === "idle" && (
                      <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                        <p className="text-xs text-gray-400">강의가 완료된 요청입니다</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ══ 지도 ════════════════════════════════════════════ */}
        <section id="map">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-bold text-hwaseong-text text-lg">강의 위치 지도</h2>
              <p className="text-xs text-gray-400 mt-0.5">화성시 권역별 강의 현황 — 마커를 클릭하면 상세 정보가 표시됩니다</p>
            </div>
            {/* 마커 범례 */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#0066CC] inline-block" />신청 대기
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-green-600 inline-block" />수락 완료
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-gray-400 inline-block" />강의 완료
              </span>
              <span className="flex items-center gap-1.5 text-gray-400">
                <span className="w-6 h-0 border-t-2 border-dashed border-gray-400 inline-block" />권역 경계
              </span>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" style={{ height: 520 }}>
            <MatchingMap markers={mapMarkers} />
          </div>
          <p className="text-xs text-gray-400 mt-2 text-right">© OpenStreetMap contributors · © CARTO</p>
        </section>

        {/* ══ 현장 보고서 폼 ══════════════════════════════════ */}
        <section id="report">
          <h2 className="font-bold text-hwaseong-text text-lg mb-1">현장 간편 보고서</h2>
          <p className="text-sm text-gray-500 mb-4">강의 종료 후 바로 제출하는 모바일 최적화 보고서입니다.</p>

          {submitted ? (
            <div className="bg-white rounded-2xl border border-green-200 shadow-sm p-8 text-center">
              <div className="text-5xl mb-3">🎉</div>
              <h3 className="font-bold text-hwaseong-text text-lg mb-1">보고서가 제출되었습니다!</h3>
              <p className="text-sm text-gray-500 mb-5">수고하셨습니다. 제출 내용은 관리자가 검토합니다.</p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setReportForm({ requestId: "", rating: 0, attendees: "", note: "" });
                  setPhotos([]);
                }}
                className="bg-hwaseong-blue text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-900 transition-colors"
              >
                새 보고서 작성
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-5"
            >
              {/* 강의 선택 */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">강의 선택</label>
                <select
                  value={reportForm.requestId}
                  onChange={(e) => setReportForm((p) => ({ ...p, requestId: e.target.value }))}
                  required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-hwaseong-blue bg-white"
                >
                  <option value="">강의를 선택해 주세요</option>
                  {MOCK_MATCH_REQUESTS.filter((r) => r.status === "matched" || r.status === "completed").map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.requester_org} — {r.theme} ({r.preferred_date})
                    </option>
                  ))}
                </select>
              </div>

              {/* 현장 사진 */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">
                  현장 사진 <span className="text-gray-400 font-normal">(최대 3장)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {photos.map((p, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt="현장 사진" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/50 text-white rounded-full text-xs flex items-center justify-center leading-none"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {photos.length < 3 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:border-hwaseong-blue hover:text-hwaseong-blue transition-colors flex-shrink-0"
                    >
                      <span className="text-xl leading-none">+</span>
                      <span className="text-xs mt-0.5">사진 추가</span>
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </div>

              {/* 만족도 / 참석자 (2 col) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1.5">강의 만족도</label>
                  <StarInput
                    value={reportForm.rating}
                    onChange={(v) => setReportForm((p) => ({ ...p, rating: v }))}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {["", "아쉬웠어요", "보통이에요", "괜찮았어요", "좋았어요", "최고였어요"][reportForm.rating] || "별점을 선택해 주세요"}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1.5">실제 참석 인원</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={reportForm.attendees}
                      onChange={(e) => setReportForm((p) => ({ ...p, attendees: e.target.value }))}
                      placeholder="0"
                      required
                      className="w-24 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-center focus:outline-none focus:border-hwaseong-blue"
                    />
                    <span className="text-sm text-gray-500">명</span>
                  </div>
                </div>
              </div>

              {/* 소감 */}
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1.5">강의 소감 및 특이사항</label>
                <textarea
                  rows={4}
                  value={reportForm.note}
                  onChange={(e) => setReportForm((p) => ({ ...p, note: e.target.value }))}
                  placeholder="강의 진행 중 특이사항, 수강생 반응, 개선점 등을 자유롭게 적어주세요."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-hwaseong-blue resize-none"
                />
              </div>

              {/* 제출 버튼 */}
              <button
                type="submit"
                className="w-full py-3 bg-hwaseong-blue text-white rounded-xl text-sm font-bold hover:bg-blue-900 transition-colors active:scale-[0.98] shadow-md"
              >
                보고서 제출하기
              </button>
            </form>
          )}
        </section>

      </DashboardLayout>
    </>
  );
}
