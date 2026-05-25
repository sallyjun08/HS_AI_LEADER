import Head from "next/head";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/lib/auth-context";
import DashboardLayout from "@/components/DashboardLayout";

type PendingRequest = {
  id: string;
  title: string;
  category: string;
  participant_count: number;
  institution_type: string | null;
  address: string | null;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  frequency: string;
  location_type: string;
  created_at: string;
  client: { name: string; email: string; org_name: string | null; org_type: string | null } | null;
};

const FREQ_LABELS: Record<string, string> = { single: "1회성", regular: "정기" };
const LOC_LABELS: Record<string, string> = { offline: "대면", online: "온라인", hybrid: "혼합" };

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ko-KR", { year: "2-digit", month: "2-digit", day: "2-digit" });
}

export default function AdminReviewPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [fetching, setFetching] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<PendingRequest | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  async function fetchPending() {
    setFetching(true);
    const res = await fetch("/api/admin/match-requests/pending");
    const data = await res.json().catch(() => []);
    if (Array.isArray(data)) setRequests(data);
    setFetching(false);
  }

  useEffect(() => {
    if (user) fetchPending();
  }, [user]);

  async function handleApprove(req: PendingRequest) {
    setProcessing(req.id);
    const res = await fetch(`/api/admin/match-requests/${req.id}/approve`, { method: "PATCH" });
    if (res.ok) {
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
      setToast({ msg: `"${req.title}" 승인 완료 — 매칭센터로 이관됐습니다.`, ok: true });
    } else {
      const err = await res.json().catch(() => ({}));
      setToast({ msg: (err as { error?: string }).error ?? "승인 중 오류가 발생했습니다.", ok: false });
    }
    setProcessing(null);
  }

  async function handleCancel() {
    if (!cancelTarget || cancelReason.trim().length < 5) return;
    setProcessing(cancelTarget.id);
    const res = await fetch(`/api/admin/match-requests/${cancelTarget.id}/cancel`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: cancelReason.trim() }),
    });
    if (res.ok) {
      setRequests((prev) => prev.filter((r) => r.id !== cancelTarget.id));
      setToast({ msg: `"${cancelTarget.title}" 요청이 반려됐습니다.`, ok: true });
      setCancelTarget(null);
      setCancelReason("");
    } else {
      const err = await res.json().catch(() => ({}));
      setToast({ msg: (err as { error?: string }).error ?? "반려 처리 중 오류가 발생했습니다.", ok: false });
    }
    setProcessing(null);
  }

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-hwaseong-blue border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <>
      <Head><title>요청 검토 | 화성 AI 시민리더 잇다</title></Head>
      <DashboardLayout pageTitle="교육 요청 검토">

        {/* 토스트 */}
        {toast && (
          <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold text-white transition-all ${toast.ok ? "bg-green-600" : "bg-red-500"}`}>
            {toast.ok ? "✅ " : "⚠️ "}{toast.msg}
          </div>
        )}

        {/* 헤더 */}
        <div className="bg-gradient-to-br from-amber-600 to-orange-600 rounded-3xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">🔍</div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-black text-white">교육 요청 검토</h2>
            <p className="text-amber-100 text-xs mt-0.5">
              수요처가 신청한 교육 요청을 검토하고 승인 또는 반려합니다. 승인된 요청은 매칭센터로 이관됩니다.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {requests.length > 0 && (
              <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                대기 {requests.length}건
              </span>
            )}
            <button
              onClick={fetchPending}
              disabled={fetching}
              className="text-xs bg-white/10 border border-white/30 text-white px-3 py-1.5 rounded-xl hover:bg-white/20 transition-colors disabled:opacity-50"
            >
              {fetching ? "로딩..." : "↺ 새로고침"}
            </button>
          </div>
        </div>

        {/* 목록 */}
        {fetching ? (
          <div className="flex items-center justify-center py-20 text-gray-300">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-amber-500 rounded-full animate-spin mr-3" />
            로딩 중...
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-gray-100">
            <p className="text-5xl mb-4">✅</p>
            <p className="font-bold text-gray-500 mb-1">검토 대기 중인 요청이 없습니다</p>
            <p className="text-xs text-gray-400">새로운 요청이 들어오면 여기에 표시됩니다.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => {
              const org = req.client;
              return (
                <div key={req.id} className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
                  {/* 카드 헤더 */}
                  <div className="px-5 py-4 flex items-start gap-4">
                    {/* 기관 아이콘 */}
                    <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">🏢</div>

                    {/* 내용 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">검토 대기</span>
                        <p className="font-bold text-hwaseong-text text-sm">{req.title}</p>
                      </div>

                        {/* 기관 정보 — 화성시 소재 여부 확인의 핵심 */}
                      {org && (
                        <div className="mb-3">
                          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                            <span className="text-lg flex-shrink-0 mt-0.5">🏢</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-black text-amber-900">
                                  {org.org_name ?? org.name}
                                </span>
                                {org.org_type && (
                                  <span className="text-[10px] bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-bold">{org.org_type}</span>
                                )}
                              </div>
                              {req.address && (
                                <p className="text-[11px] text-amber-700 font-medium mt-0.5">📍 {req.address}</p>
                              )}
                            </div>
                          </div>
                          <p className="text-[10px] text-gray-400 mt-1.5 px-1">
                            담당자 {org.name} · {org.email}
                          </p>
                        </div>
                      )}

                      {/* 요청 상세 */}
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
                        <span>🎯 {req.category}</span>
                        <span>👥 {req.participant_count}명</span>
                        <span>📅 {req.start_date}{req.end_date ? ` ~ ${req.end_date}` : ""}</span>
                        {req.institution_type && <span>🏫 {req.institution_type}</span>}
                        <span>🔄 {FREQ_LABELS[req.frequency] ?? req.frequency}</span>
                        <span>📡 {LOC_LABELS[req.location_type] ?? req.location_type}</span>
                        <span className="text-gray-300">등록 {fmtDate(req.created_at)}</span>
                      </div>

                      {req.notes && (
                        <p className="mt-2 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 line-clamp-2">
                          📝 {req.notes}
                        </p>
                      )}
                    </div>

                    {/* 액션 버튼 */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleApprove(req)}
                        disabled={processing === req.id}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                      >
                        {processing === req.id ? "처리 중..." : "✅ 승인"}
                      </button>
                      <button
                        onClick={() => { setCancelTarget(req); setCancelReason(""); }}
                        disabled={processing === req.id}
                        className="px-4 py-2 bg-gray-100 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 text-gray-500 text-xs font-bold rounded-xl transition-colors"
                      >
                        ✕ 반려
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 반려 모달 */}
        {cancelTarget && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
              <h3 className="font-black text-hwaseong-text text-lg mb-1">요청 반려</h3>
              <p className="text-sm text-gray-400 mb-4">
                <span className="font-semibold text-gray-600">"{cancelTarget.title}"</span> 요청을 반려합니다. 수요처에게 안내할 사유를 입력해 주세요.
              </p>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="예: 화성시 소재 기관만 신청 가능합니다."
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
              />
              {cancelReason.trim().length > 0 && cancelReason.trim().length < 5 && (
                <p className="text-xs text-red-400 mt-1">5자 이상 입력해 주세요.</p>
              )}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => { setCancelTarget(null); setCancelReason(""); }}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-semibold rounded-xl transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleCancel}
                  disabled={cancelReason.trim().length < 5 || processing === cancelTarget.id}
                  className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors"
                >
                  {processing === cancelTarget.id ? "처리 중..." : "반려하기"}
                </button>
              </div>
            </div>
          </div>
        )}

      </DashboardLayout>
    </>
  );
}
