import Head from "next/head";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/lib/auth-context";
import DashboardLayout from "@/components/DashboardLayout";

type MatchRequest = {
  id: string;
  title: string;
  address: string | null;
  status: string;
};

type Report = {
  id: string;
  match_id: string;
  lecture_date: string;
  attendance_count: number;
  report_text: string | null;
  image_urls: string[];
  rating_from_client: number | null;
  client_feedback: string | null;
  submitted_at: string;
  admin_approved_at: string | null;
  match: { title: string; address: string | null } | null;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
}

function StarRating({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-gray-300">미평가</span>;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} className={`w-3.5 h-3.5 ${i <= Math.round(value) ? "text-amber-400" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="text-xs font-bold text-amber-600 ml-1">{Number(value).toFixed(1)}</span>
    </div>
  );
}

export default function LeaderReportsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [matches, setMatches] = useState<MatchRequest[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [reportForm, setReportForm] = useState({
    matchId: "", lectureDate: "", attendeeCount: "", reportText: "",
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [reportOk, setReportOk] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== "leader")) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  async function fetchAll() {
    const [m, r] = await Promise.all([
      fetch("/api/match-requests").then((r) => r.json()),
      fetch("/api/activity-reports").then((r) => r.json()),
    ]);
    if (Array.isArray(m)) setMatches(m);
    if (Array.isArray(r)) setReports(r);
  }

  useEffect(() => {
    if (user) fetchAll();
  }, [user]);

  const submittedIds    = useMemo(() => new Set(reports.map((r) => r.match_id)), [reports]);
  const eligibleMatches = useMemo(
    () => matches.filter((m) => (m.status === "matched" || m.status === "ongoing") && !submittedIds.has(m.id)),
    [matches, submittedIds]
  );
  const pendingApprovalCount = useMemo(() => reports.filter((r) => r.admin_approved_at === null).length, [reports]);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 3);
    setImageFiles(files);
    setImagePreviews(files.map((f) => URL.createObjectURL(f)));
    e.target.value = "";
  }

  function removeImage(idx: number) {
    URL.revokeObjectURL(imagePreviews[idx]);
    setImageFiles((p) => p.filter((_, i) => i !== idx));
    setImagePreviews((p) => p.filter((_, i) => i !== idx));
  }

  async function uploadImages(): Promise<string[]> {
    const urls: string[] = [];
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      setUploadProgress(`사진 업로드 중 ${i + 1}/${imageFiles.length}...`);
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/upload/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, mimeType: file.type, data: base64 }),
      });
      if (res.ok) {
        const { url } = await res.json();
        urls.push(url);
      }
    }
    setUploadProgress(null);
    return urls;
  }

  async function submitReport(e: React.SyntheticEvent) {
    e.preventDefault();
    setSubmittingReport(true);
    try {
      const imageUrls = imageFiles.length > 0 ? await uploadImages() : [];
      const res = await fetch("/api/activity-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId:       reportForm.matchId,
          lectureDate:   reportForm.lectureDate,
          attendeeCount: Number(reportForm.attendeeCount),
          reportText:    reportForm.reportText,
          imageUrls,
        }),
      });
      if (res.ok) {
        await fetchAll();
        setReportForm({ matchId: "", lectureDate: "", attendeeCount: "", reportText: "" });
        imagePreviews.forEach((u) => URL.revokeObjectURL(u));
        setImageFiles([]);
        setImagePreviews([]);
        setReportOk(true);
        setTimeout(() => setReportOk(false), 3000);
        setToast({ msg: "활동 보고서가 제출되었습니다.", ok: true });
      } else {
        const err = await res.json().catch(() => ({}));
        setToast({ msg: (err as { error?: string }).error ?? "제출 중 오류가 발생했습니다.", ok: false });
      }
    } finally {
      setSubmittingReport(false);
      setUploadProgress(null);
    }
  }

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-hwaseong-blue border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <>
      <Head><title>활동 보고 | 화성 AI 시민리더 잇다</title></Head>
      <DashboardLayout pageTitle="활동 보고">

        {/* 보고서 제출 폼 */}
        {eligibleMatches.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-bold text-hwaseong-text mb-4 text-sm">활동 보고서 제출</h3>
            <form onSubmit={submitReport} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">매칭 선택 <span className="text-red-400">*</span></label>
                <select
                  value={reportForm.matchId}
                  onChange={(e) => setReportForm((p) => ({ ...p, matchId: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30 bg-white"
                  required
                >
                  <option value="">-- 매칭 선택 --</option>
                  {eligibleMatches.map((m) => (
                    <option key={m.id} value={m.id}>{m.title}{m.address ? ` (${m.address})` : ""}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">강의 날짜 <span className="text-red-400">*</span></label>
                  <input type="date" value={reportForm.lectureDate}
                    onChange={(e) => setReportForm((p) => ({ ...p, lectureDate: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30"
                    required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">실제 참석자 수 <span className="text-red-400">*</span></label>
                  <input type="number" min="1" value={reportForm.attendeeCount}
                    onChange={(e) => setReportForm((p) => ({ ...p, attendeeCount: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30"
                    required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">강의 일지</label>
                <textarea rows={3} value={reportForm.reportText}
                  onChange={(e) => setReportForm((p) => ({ ...p, reportText: e.target.value }))}
                  placeholder="강의 내용, 수강생 반응, 특이사항 등을 작성해 주세요."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">현장 사진 <span className="text-gray-400 font-normal">(최대 3장, 각 8MB 이하)</span></label>
                {imagePreviews.length < 3 && (
                  <label className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-hwaseong-blue/40 hover:bg-hwaseong-light transition-colors">
                    <span className="text-lg">📷</span>
                    <span className="text-xs text-gray-500">사진 선택하기</span>
                    <input
                      type="file" accept="image/*" multiple className="hidden"
                      onChange={handleImageChange}
                      disabled={submittingReport}
                    />
                  </label>
                )}
                {imagePreviews.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {imagePreviews.map((src, idx) => (
                      <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt={`사진 ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center text-[10px] hover:bg-red-500 transition-colors"
                        >✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button type="submit" disabled={submittingReport}
                className="w-full py-3 bg-hwaseong-blue text-white text-sm font-bold rounded-xl hover:bg-blue-900 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {submittingReport ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "📤"}
                {uploadProgress ?? (submittingReport ? "제출 중..." : reportOk ? "✅ 제출 완료!" : "보고서 제출")}
              </button>
            </form>
          </div>
        )}

        {/* 제출된 보고서 목록 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-hwaseong-text text-sm">제출된 활동 보고서 ({reports.length}건)</h3>
            {pendingApprovalCount > 0 && (
              <span className="text-[11px] bg-amber-100 text-amber-700 font-bold px-2 py-1 rounded-full">
                승인 대기 {pendingApprovalCount}건
              </span>
            )}
          </div>

          {reports.length === 0 && (
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 text-gray-400">
              <p className="text-4xl mb-3">📄</p>
              <p className="text-sm">아직 제출된 보고서가 없습니다.</p>
            </div>
          )}

          {reports.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <p className="font-semibold text-hwaseong-text text-sm truncate">{r.match?.title ?? "—"}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{r.match?.address} · 강의일 {fmtDate(r.lecture_date)}</p>
                </div>
                <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-1 rounded-full ${
                  r.admin_approved_at ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                }`}>
                  {r.admin_approved_at ? "✓ 승인완료" : "⏳ 승인대기"}
                </span>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-3">
                <span className="bg-gray-50 px-2 py-1 rounded-lg">👥 참석 {r.attendance_count}명</span>
                <span className="bg-gray-50 px-2 py-1 rounded-lg">📤 제출 {fmtDate(r.submitted_at)}</span>
                {r.admin_approved_at && (
                  <span className="bg-green-50 text-green-700 px-2 py-1 rounded-lg">✅ 승인 {fmtDate(r.admin_approved_at)}</span>
                )}
              </div>
              {r.report_text && <p className="text-xs text-gray-600 leading-relaxed mb-3 line-clamp-2">{r.report_text}</p>}
              <div className="flex items-center gap-2">
                <StarRating value={r.rating_from_client} />
              </div>
              {r.client_feedback && (
                <p className="mt-2 text-xs text-gray-500 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 leading-relaxed">
                  💬 {r.client_feedback}
                </p>
              )}
              {r.image_urls && r.image_urls.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {r.image_urls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                      className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0 hover:opacity-80 transition-opacity">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`현장사진 ${i + 1}`} className="w-full h-full object-cover" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

      </DashboardLayout>

      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-white text-sm font-semibold max-w-sm ${
          toast.ok ? "bg-green-600" : "bg-red-500"
        }`}>
          <span>{toast.ok ? "✅" : "❌"}</span>
          <span className="flex-1">{toast.msg}</span>
          <button onClick={() => setToast(null)} className="opacity-70 hover:opacity-100">✕</button>
        </div>
      )}
    </>
  );
}
