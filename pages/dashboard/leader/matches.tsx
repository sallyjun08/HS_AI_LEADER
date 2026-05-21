import Head from "next/head";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/lib/auth-context";
import DashboardLayout from "@/components/DashboardLayout";

type ScheduleMaterial = {
  id: string;
  title: string;
  file_url: string;
  file_type: string | null;
  file_size_kb: number | null;
  created_at: string;
  uploader: { name: string; role: string } | null;
};

type ScheduleMatch = {
  id: string;
  title: string;
  category: string;
  start_date: string;
  end_date: string | null;
  address: string | null;
  notes: string | null;
  participant_count: number;
  target_age: string | null;
  frequency: string;
  location_type: string;
  client_profile: { name: string; email: string; phone: string | null } | null;
  materials: ScheduleMaterial[];
};

type MatchRequest = {
  id: string;
  title: string;
  category: string;
  target_age: string | null;
  participant_count: number;
  start_date: string;
  address: string | null;
  notes: string | null;
  frequency: string;
  location_type: string;
  status: string;
  client: { name: string } | null;
};

const LOC_LABELS: Record<string, string> = { offline: "대면", online: "온라인", hybrid: "혼합" };
const FREQ_LABELS: Record<string, string> = { single: "1회성", regular: "정기" };

function mapUrl(service: "kakao" | "naver", address: string): string {
  const q = encodeURIComponent(address);
  return service === "kakao"
    ? `https://map.kakao.com/?q=${q}`
    : `https://map.naver.com/v5/search/${q}`;
}

function fileIcon(type: string | null): string {
  if (type === "pdf") return "📕";
  if (type === "pptx" || type === "ppt") return "📊";
  if (type === "docx" || type === "doc") return "📝";
  if (type === "image") return "🖼️";
  return "📄";
}

function fmtFileSize(kb: number | null): string {
  if (!kb) return "";
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export default function LeaderMatchesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [matches, setMatches] = useState<MatchRequest[]>([]);
  const [scheduleMatches, setScheduleMatches] = useState<ScheduleMatch[]>([]);
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());
  const [expandedSchedule, setExpandedSchedule] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ matchId: string; title: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
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
    const [m, r, s] = await Promise.all([
      fetch("/api/match-requests").then((r) => r.json()),
      fetch("/api/activity-reports").then((r) => r.json()),
      fetch("/api/schedule").then((r) => r.json()).catch(() => []),
    ]);
    if (Array.isArray(m)) setMatches(m);
    if (Array.isArray(r)) setSubmittedIds(new Set((r as { match_id: string }[]).map((x) => x.match_id)));
    if (Array.isArray(s)) setScheduleMatches(s);
  }

  useEffect(() => {
    if (user) fetchAll();
  }, [user]);

  async function acceptMatch(matchId: string) {
    setActionInProgress(matchId);
    const res = await fetch(`/api/match-requests/${matchId}/accept`, { method: "PATCH" });
    if (res.ok) { await fetchAll(); setToast({ msg: "매칭을 수락했습니다.", ok: true }); }
    else setToast({ msg: "처리 중 오류가 발생했습니다.", ok: false });
    setActionInProgress(null);
  }

  async function rejectMatch(matchId: string, reason: string) {
    setRejectingId(matchId);
    const res = await fetch(`/api/match-requests/${matchId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (res.ok) {
      await fetchAll();
      setToast({ msg: "거절 처리되었습니다. 관리자가 재배정합니다.", ok: false });
    } else {
      setToast({ msg: "처리 중 오류가 발생했습니다.", ok: false });
    }
    setRejectingId(null);
    setRejectModal(null);
    setRejectReason("");
  }

  const pendingMatches   = useMemo(() => matches.filter((m) => m.status === "matched"), [matches]);
  const ongoingMatches   = useMemo(() => matches.filter((m) => m.status === "ongoing"), [matches]);
  const completedMatches = useMemo(() => matches.filter((m) => m.status === "completed"), [matches]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-hwaseong-blue border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <>
      <Head><title>매칭 요청 | 화성 AI 시민리더 잇다</title></Head>
      <DashboardLayout pageTitle="매칭 요청">

        {/* 신규 배정 알림 배너 */}
        {pendingMatches.length > 0 && (
          <div className="rounded-3xl overflow-hidden shadow-lg border-2 border-amber-300">
            <div className="bg-amber-500 px-5 py-3 flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
              </span>
              <p className="font-black text-white text-sm flex-1">
                신규 강의 배정 {pendingMatches.length}건 — 응답을 기다리고 있습니다
              </p>
              <span className="text-white/70 text-[11px] hidden sm:block">빠른 응답을 권장합니다</span>
            </div>
          </div>
        )}

        {/* 수락 대기 */}
        {pendingMatches.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-amber-700">🔔 수락 대기</span>
              <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-full">{pendingMatches.length}</span>
            </div>
            {pendingMatches.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                actionInProgress={actionInProgress}
                onAccept={() => acceptMatch(m.id)}
                onReject={() => { setRejectModal({ matchId: m.id, title: m.title }); setRejectReason(""); }}
                showActions
              />
            ))}
          </div>
        )}

        {/* 진행 중 */}
        {ongoingMatches.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-green-700">▶️ 진행 중</span>
              <span className="text-[10px] bg-green-100 text-green-700 font-bold px-1.5 py-0.5 rounded-full">{ongoingMatches.length}</span>
            </div>
            {ongoingMatches.map((m) => {
              const detail = scheduleMatches.find((s) => s.id === m.id);
              const expanded = expandedSchedule === m.id;
              return (
                <div key={m.id}>
                  <MatchCard
                    match={m}
                    actionInProgress={actionInProgress}
                    onAccept={() => acceptMatch(m.id)}
                    onReject={() => { setRejectModal({ matchId: m.id, title: m.title }); setRejectReason(""); }}
                    extra={
                      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-50 gap-2">
                        {detail ? (
                          <button
                            onClick={() => setExpandedSchedule(expanded ? null : m.id)}
                            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${
                              expanded
                                ? "bg-hwaseong-blue/5 border-hwaseong-blue/30 text-hwaseong-blue"
                                : "bg-gray-50 border-gray-200 text-gray-500 hover:border-hwaseong-blue/30 hover:text-hwaseong-blue"
                            }`}
                          >
                            {expanded ? "▲ 일정 접기" : "📅 일정 상세 보기"}
                          </button>
                        ) : (
                          <span className="text-xs text-green-600 bg-green-50 py-1.5 px-3 rounded-xl">✅ 수락 완료</span>
                        )}
                        {!submittedIds.has(m.id) && (
                          <button
                            onClick={() => router.push(`/dashboard/leader/report?matchId=${m.id}`)}
                            className="text-[11px] font-bold px-3 py-1.5 bg-hwaseong-blue text-white rounded-xl hover:bg-blue-900 transition-colors"
                          >
                            보고서 제출 →
                          </button>
                        )}
                        {submittedIds.has(m.id) && (
                          <span className="text-[11px] text-green-600 font-semibold bg-green-50 px-3 py-1.5 rounded-xl">✅ 보고서 제출 완료</span>
                        )}
                      </div>
                    }
                  />

                  {expanded && detail && (
                    <div className="bg-gray-50 border border-gray-100 border-t-0 rounded-b-2xl p-4 space-y-3 -mt-1">
                      {detail.address ? (
                        <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-gray-100">
                          <span className="text-base flex-shrink-0">📍</span>
                          <p className="text-sm text-gray-700 flex-1 font-medium">{detail.address}</p>
                          <div className="flex gap-1.5 flex-shrink-0">
                            <a href={mapUrl("kakao", detail.address)} target="_blank" rel="noopener noreferrer"
                              className="text-[11px] font-bold px-2.5 py-1.5 bg-yellow-400 text-yellow-900 rounded-lg hover:bg-yellow-500 transition-colors">
                              카카오
                            </a>
                            <a href={mapUrl("naver", detail.address)} target="_blank" rel="noopener noreferrer"
                              className="text-[11px] font-bold px-2.5 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                              네이버
                            </a>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 bg-white rounded-xl px-4 py-3 border border-gray-100">📍 장소 미정</p>
                      )}

                      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                        <div className="bg-gray-50 px-4 py-2 flex items-center gap-2 border-b border-gray-100">
                          <span className="text-sm">🏢</span>
                          <p className="text-xs font-bold text-gray-600">수요처 담당자</p>
                          <span className="ml-auto text-[10px] text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full">연락처 공개됨</span>
                        </div>
                        <div className="px-4 py-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-hwaseong-text text-sm">{detail.client_profile?.name ?? "—"}</p>
                            {detail.client_profile?.email && (
                              <p className="text-xs text-gray-400 mt-0.5 truncate">{detail.client_profile.email}</p>
                            )}
                          </div>
                          {detail.client_profile?.phone ? (
                            <a
                              href={`tel:${detail.client_profile.phone.replace(/[^0-9+]/g, "")}`}
                              className="flex items-center gap-1.5 px-4 py-2 bg-hwaseong-blue text-white text-xs font-bold rounded-xl hover:bg-blue-900 transition-colors flex-shrink-0"
                            >
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                              </svg>
                              {detail.client_profile.phone}
                            </a>
                          ) : (
                            <span className="text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-xl">연락처 미등록</span>
                          )}
                        </div>
                      </div>

                      {detail.materials.length > 0 && (
                        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                          <div className="bg-gray-50 px-4 py-2 flex items-center gap-2 border-b border-gray-100">
                            <span className="text-sm">📂</span>
                            <p className="text-xs font-bold text-gray-600">강의 자료실</p>
                            <span className="ml-auto text-[10px] text-gray-400">{detail.materials.length}개</span>
                          </div>
                          <div className="divide-y divide-gray-50">
                            {detail.materials.map((mat) => (
                              <div key={mat.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/60 transition-colors">
                                <span className="text-xl flex-shrink-0">{fileIcon(mat.file_type)}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-hwaseong-text truncate">{mat.title}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {mat.uploader && (
                                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${mat.uploader.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                                        {mat.uploader.role === "admin" ? "운영자" : "수요처"}
                                      </span>
                                    )}
                                    {mat.file_size_kb && <span className="text-[10px] text-gray-400">{fmtFileSize(mat.file_size_kb)}</span>}
                                  </div>
                                </div>
                                <a href={mat.file_url} target="_blank" rel="noopener noreferrer" download
                                  className="flex-shrink-0 text-[11px] font-bold px-3 py-1.5 bg-hwaseong-blue/10 text-hwaseong-blue rounded-xl hover:bg-hwaseong-blue hover:text-white transition-colors">
                                  ↓ 다운로드
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {detail.notes && (
                        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                          <p className="text-[10px] font-bold text-amber-600 mb-1">📝 수요처 요청사항</p>
                          <p className="text-xs text-amber-800 leading-relaxed">{detail.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 완료됨 */}
        {completedMatches.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-500">✅ 완료됨</span>
              <span className="text-[10px] bg-gray-100 text-gray-500 font-bold px-1.5 py-0.5 rounded-full">{completedMatches.length}</span>
            </div>
            {completedMatches.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                actionInProgress={actionInProgress}
                onAccept={() => acceptMatch(m.id)}
                onReject={() => { setRejectModal({ matchId: m.id, title: m.title }); setRejectReason(""); }}
                muted
              />
            ))}
          </div>
        )}

        {matches.length === 0 && (
          <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 text-gray-400">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-sm">아직 배정된 매칭 요청이 없습니다.</p>
          </div>
        )}

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

      {rejectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={(e) => { if (e.target === e.currentTarget) setRejectModal(null); }}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <p className="text-xs font-semibold text-red-500 mb-1.5">매칭 거절</p>
              <h3 className="font-bold text-hwaseong-text text-sm leading-snug line-clamp-2">{rejectModal.title}</h3>
            </div>
            <div className="px-6 py-4 space-y-3">
              <p className="text-sm text-gray-500">거절 처리 후 관리자가 다른 강사로 재배정합니다.</p>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  거절 사유 <span className="font-normal text-gray-400">(선택)</span>
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="일정 충돌, 전문 분야 불일치 등 사유를 입력해 주세요."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-200 resize-none"
                  autoFocus
                />
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-2">
              <button
                onClick={() => setRejectModal(null)}
                disabled={rejectingId !== null}
                className="flex-1 py-3 border-2 border-gray-200 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={() => rejectMatch(rejectModal.matchId, rejectReason)}
                disabled={rejectingId !== null}
                className="flex-1 py-3 bg-red-500 text-white text-sm font-bold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {rejectingId
                  ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />처리 중...</>
                  : "거절 확인"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MatchCard({
  match: m,
  actionInProgress,
  onAccept,
  onReject,
  showActions = false,
  muted = false,
  extra,
}: {
  match: MatchRequest;
  actionInProgress: string | null;
  onAccept: () => void;
  onReject: () => void;
  showActions?: boolean;
  muted?: boolean;
  extra?: React.ReactNode;
}) {
  const busy = actionInProgress === m.id;
  return (
    <div className={`rounded-2xl p-4 shadow-sm border ${muted ? "bg-gray-50 border-gray-100 opacity-70" : "bg-white border-gray-100"}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="font-semibold text-hwaseong-text text-sm truncate">{m.title}</p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{m.client?.name}</p>
        </div>
        <StatusBadge status={m.status} />
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {[
          m.category && `🎯 ${m.category}`,
          m.address && `📍 ${m.address}`,
          `📅 ${m.start_date}`,
          `👥 ${m.participant_count}명${m.target_age ? ` (${m.target_age})` : ""}`,
          m.frequency && FREQ_LABELS[m.frequency] && `🔄 ${FREQ_LABELS[m.frequency]}`,
          m.location_type && LOC_LABELS[m.location_type] && `📡 ${LOC_LABELS[m.location_type]}`,
        ].filter(Boolean).map((tag) => (
          <span key={String(tag)} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg">{tag}</span>
        ))}
      </div>
      {m.notes && <p className="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2 mb-2 line-clamp-2">📝 {m.notes}</p>}
      {showActions && (
        <div className="flex gap-2">
          <button onClick={onAccept} disabled={busy}
            className="flex-1 py-2.5 bg-hwaseong-blue text-white text-xs font-bold rounded-xl hover:bg-blue-900 transition-colors disabled:opacity-50">
            {busy ? "처리 중..." : "✅ 수락"}
          </button>
          <button onClick={onReject} disabled={busy}
            className="flex-1 py-2.5 bg-white border-2 border-red-300 text-red-500 text-xs font-bold rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50">
            {busy ? "..." : "✕ 거절"}
          </button>
        </div>
      )}
      {extra}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:   { label: "대기 중",  cls: "bg-amber-100 text-amber-700" },
    matched:   { label: "수락 대기", cls: "bg-blue-100 text-blue-700" },
    ongoing:   { label: "진행 중",  cls: "bg-green-100 text-green-700" },
    completed: { label: "완료",     cls: "bg-gray-100 text-gray-600" },
    cancelled: { label: "취소",     cls: "bg-red-50 text-red-500" },
    rejected:  { label: "거절됨",   cls: "bg-orange-100 text-orange-700" },
  };
  const s = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-500" };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${s.cls}`}>{s.label}</span>;
}
