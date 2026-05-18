import Head from "next/head";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/lib/auth-context";
import DashboardLayout from "@/components/DashboardLayout";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type Stats = {
  leaders: { total: number; verified: number };
  requests: { total: number; pending: number; matched: number; completed: number };
  reports: { total: number; totalAttendees: number; avgSatisfaction: number };
  monthlyStats: { month: string; count: number }[];
};

type Leader = {
  id: string;
  maskedName: string;
  realName?: string;
  certLevel: number;
  isVerified: boolean;
  isActive: boolean;
  specialties: string[];
  availableRegions: string[];
  bio: string | null;
  ratingAvg: number;
  totalLectures: number;
  phone?: string | null;
};

type MatchRequest = {
  id: string;
  title: string;
  category: string;
  target_age: string | null;
  participant_count: number;
  start_date: string;
  address: string | null;
  status: string;
  client: { name: string } | null;
  leader: Leader | null;
};

type Report = {
  id: string;
  lecture_date: string;
  attendance_count: number;
  report_text: string | null;
  rating_from_client: number | null;
  submitted_at: string;
  match: { title: string; address: string | null; start_date: string; leader: { profiles: { name: string } | null } | null } | null;
};

const CERT_LABELS: Record<number, string> = { 1: "Lv.1 기초", 2: "Lv.2 리더", 3: "Lv.3 전문" };

export default function AdminDashboard() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"stats" | "leaders" | "requests" | "matching" | "reports">("stats");
  const [stats, setStats] = useState<Stats | null>(null);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [requests, setRequests] = useState<MatchRequest[]>([]);
  const [reports, setReports] = useState<Report[]>([]);

  const [selectedReq, setSelectedReq] = useState<MatchRequest | null>(null);
  const [scoredLeaders, setScoredLeaders] = useState<(Leader & { matchScore?: number })[]>([]);
  const [matching, setMatching] = useState(false);
  const [matchSuccess, setMatchSuccess] = useState(false);

  const [matchModal, setMatchModal] = useState(false);
  const [selectedReqForAssign, setSelectedReqForAssign] = useState<MatchRequest | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignedReqId, setAssignedReqId] = useState<string | null>(null);
  const [liveTab, setLiveTab] = useState<"pending" | "matched" | "rejected">("pending");
  const [refreshing, setRefreshing] = useState(false);
  const [leaderSearch, setLeaderSearch] = useState("");
  const [selectedLeaderId, setSelectedLeaderId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) router.replace("/login");
  }, [loading, user, router]);

  async function fetchAll() {
    const [s, l, rq, rp] = await Promise.all([
      fetch("/api/admin/stats").then((r) => r.json()),
      fetch("/api/leaders").then((r) => r.json()),
      fetch("/api/match-requests").then((r) => r.json()),
      fetch("/api/activity-reports").then((r) => r.json()),
    ]);
    setStats(s); setLeaders(l); setRequests(rq); setReports(rp);
  }

  useEffect(() => {
    if (user) fetchAll();
  }, [user]);

  async function handleRefresh() {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }

  // 토스트 자동 소멸
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // 모달 열릴 때 검색·선택 초기화
  useEffect(() => {
    if (matchModal) { setLeaderSearch(""); setSelectedLeaderId(null); }
  }, [matchModal]);

  async function handleVerify(id: string, isVerified: boolean, certLevel?: number) {
    await fetch(`/api/admin/leaders/${id}/verify`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isVerified, ...(certLevel !== undefined && { certLevel }) }),
    });
    const updated = await fetch("/api/leaders").then((r) => r.json());
    setLeaders(updated);
  }

  function selectRequestForMatching(req: MatchRequest) {
    setSelectedReq(req);
    setMatchSuccess(false);
    const scored = leaders
      .filter((l) => l.isVerified && l.isActive)
      .map((leader) => {
        let score = 0;
        if (leader.availableRegions.some((r) => req.address?.includes(r) || r.includes(req.address ?? ""))) score += 30;
        const catWords = req.category.split(/[\s,]+/);
        const matched = leader.specialties.filter((s) => catWords.some((w) => s.includes(w) || w.includes(s)));
        score += Math.min(matched.length * 15, 40);
        score += (leader.ratingAvg / 5) * 20;
        score += Math.min(leader.totalLectures, 10);
        return { ...leader, matchScore: Math.round(score) };
      })
      .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0));
    setScoredLeaders(scored);
  }

  async function doSimpleAssign(req: MatchRequest, leaderId: string) {
    setAssigningId(leaderId);
    const res = await fetch(`/api/admin/match-requests/${req.id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leaderId }),
    });
    if (res.ok) {
      setAssignedReqId(req.id);
      setMatchModal(false);
      setSelectedLeaderId(null);
      setLeaderSearch("");
      setLiveTab("matched");
      setToast({ msg: "강사 배정이 완료됐습니다. 강사의 수락을 기다립니다.", ok: true });
      const updated = await fetch("/api/match-requests").then((r) => r.json());
      setRequests(updated);
    } else {
      setToast({ msg: "배정 중 오류가 발생했습니다. 다시 시도해 주세요.", ok: false });
    }
    setAssigningId(null);
  }

  async function doMatch(leaderId: string) {
    if (!selectedReq) return;
    setMatching(true);
    const leader = scoredLeaders.find((l) => l.id === leaderId);
    const res = await fetch(`/api/admin/match-requests/${selectedReq.id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leaderId,
        matchScore:      leader?.matchScore ?? 0,
        regionScore:     calcRegionScore(leader, selectedReq),
        specialtyScore:  calcSpecialtyScore(leader, selectedReq),
        ratingScore:     Math.round(((leader?.ratingAvg ?? 0) / 5) * 20),
        experienceScore: Math.min(leader?.totalLectures ?? 0, 10),
      }),
    });
    if (res.ok) {
      setMatchSuccess(true);
      const updated = await fetch("/api/match-requests").then((r) => r.json());
      setRequests(updated);
    }
    setMatching(false);
  }

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-hwaseong-blue border-t-transparent rounded-full animate-spin" /></div>;
  }

  const filteredModalLeaders = leaders
    .filter((l) => l.isVerified && l.isActive)
    .filter((l) => {
      if (!leaderSearch.trim()) return true;
      const q = leaderSearch.toLowerCase();
      return (l.realName ?? l.maskedName).toLowerCase().includes(q) ||
             l.specialties.some((s) => s.toLowerCase().includes(q));
    });

  const pendingRequests  = requests.filter((r) => r.status === "pending");
  const matchedRequests  = requests.filter((r) => r.status === "matched");
  const rejectedRequests = requests.filter((r) => r.status === "rejected");
  const liveFiltered = { pending: pendingRequests, matched: matchedRequests, rejected: rejectedRequests }[liveTab];

  return (
    <>
      <Head><title>관리자 대시보드 | 화성 AI 시민리더 잇다</title></Head>
      <DashboardLayout pageTitle="통합 관제 대시보드">

        {/* 관리자 헤더 */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-6 flex items-center gap-5">
          <div className="w-14 h-14 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center text-2xl">⚙️</div>
          <div className="flex-1">
            <h2 className="text-xl font-black text-white">{user.name}</h2>
            <p className="text-gray-300 text-sm">화성특례시 AI 잇다 · 관리자</p>
          </div>
          <div className="flex items-center gap-2">
            {pendingRequests.length > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                매칭 대기 {pendingRequests.length}건
              </span>
            )}
            {rejectedRequests.length > 0 && (
              <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                거절 {rejectedRequests.length}건
              </span>
            )}
            <button onClick={signOut} className="text-xs bg-white/10 border border-white/30 text-white px-4 py-2 rounded-xl hover:bg-white/20 transition-colors">로그아웃</button>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 overflow-x-auto">
          {(["stats", "leaders", "requests", "matching", "reports"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-shrink-0 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                tab === t ? "bg-white text-hwaseong-blue shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "stats" ? "📊 통계" : t === "leaders" ? "🏅 강사 관리" : t === "requests" ? "📋 요청 목록" : t === "matching" ? "🔗 매칭 관리" : "📄 활동 보고"}
            </button>
          ))}
        </div>

        {/* 통계 탭 */}
        {tab === "stats" && stats && (
          <>
            {/* ── 실시간 교육 매칭 현황 ── */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">

              {/* 섹션 헤더 */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                  </span>
                  <h3 className="font-bold text-hwaseong-text">실시간 교육 매칭 현황</h3>
                </div>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="text-xs text-gray-400 hover:text-hwaseong-blue disabled:opacity-50 flex items-center gap-1 transition-colors"
                >
                  <span className={refreshing ? "animate-spin" : ""}>↺</span>
                  새로고침
                </button>
              </div>

              {/* 집계 카드 3개 — 클릭 시 해당 탭 필터 */}
              <div className="grid grid-cols-3 divide-x divide-gray-100">
                {([
                  { key: "pending",  label: "신규 요청",    count: pendingRequests.length,  icon: "📥", base: "bg-amber-50",  text: "text-amber-700",  urgent: pendingRequests.length > 0 },
                  { key: "matched",  label: "수락 대기",    count: matchedRequests.length,  icon: "⏳", base: "bg-sky-50",    text: "text-sky-700",    urgent: false },
                  { key: "rejected", label: "재배정 필요",  count: rejectedRequests.length, icon: "⚠️", base: "bg-red-50",    text: "text-red-700",    urgent: rejectedRequests.length > 0 },
                ] as const).map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setLiveTab(s.key)}
                    className={`py-4 px-3 text-center transition-all ${s.base} ${liveTab === s.key ? "ring-2 ring-inset ring-hwaseong-blue/30" : "hover:brightness-95"}`}
                  >
                    <p className="text-2xl mb-1">{s.icon}</p>
                    <p className={`text-3xl font-black ${s.text} leading-none`}>{s.count}</p>
                    <p className={`text-xs font-semibold mt-1 ${s.text}`}>{s.label}</p>
                    {s.urgent && s.count > 0 && (
                      <p className="text-[10px] text-red-500 font-bold mt-0.5 animate-pulse">처리 필요</p>
                    )}
                  </button>
                ))}
              </div>

              {/* 필터 탭 */}
              <div className="flex gap-1 px-3 py-2 bg-gray-50 border-y border-gray-100">
                {([
                  { key: "pending",  label: "대기",   count: pendingRequests.length },
                  { key: "matched",  label: "배정중", count: matchedRequests.length },
                  { key: "rejected", label: "거절됨", count: rejectedRequests.length },
                ] as const).map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setLiveTab(t.key)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                      liveTab === t.key ? "bg-white text-hwaseong-blue shadow-sm" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {t.label}
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${liveTab === t.key ? "bg-hwaseong-blue text-white" : "bg-gray-200 text-gray-500"}`}>
                      {t.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* 요청 리스트 */}
              <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                {liveFiltered.length === 0 ? (
                  <div className="py-10 text-center text-gray-400">
                    <p className="text-3xl mb-2">{liveTab === "pending" ? "🎉" : liveTab === "matched" ? "⏳" : "✅"}</p>
                    <p className="text-sm">
                      {liveTab === "pending" ? "대기 중인 요청이 없습니다." : liveTab === "matched" ? "수락 대기 중인 배정이 없습니다." : "거절된 요청이 없습니다."}
                    </p>
                  </div>
                ) : (
                  liveFiltered.map((req) => (
                    <LiveMatchRow
                      key={req.id}
                      req={req}
                      assignedReqId={assignedReqId}
                      onAssign={() => { setSelectedReqForAssign(req); setMatchModal(true); setAssignedReqId(null); }}
                    />
                  ))
                )}
              </div>
            </div>

            {/* ── 전체 통계 요약 ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "전체 강사", value: stats.leaders.total, sub: `인증 ${stats.leaders.verified}명`, icon: "👥", color: "bg-hwaseong-blue" },
                { label: "매칭 대기", value: stats.requests.pending, sub: "처리 필요", icon: "⏳", color: "bg-amber-500" },
                { label: "누적 수강생", value: stats.reports.totalAttendees, sub: "명", icon: "🎓", color: "bg-green-600" },
                { label: "평균 만족도", value: `${stats.reports.avgSatisfaction}점`, sub: "5점 만점", icon: "⭐", color: "bg-sky-500" },
              ].map((c) => (
                <div key={c.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className={`w-9 h-9 ${c.color} rounded-xl flex items-center justify-center text-base mb-2`}>{c.icon}</div>
                  <p className="text-2xl font-black text-hwaseong-text">{c.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{c.label} · {c.sub}</p>
                </div>
              ))}
            </div>

            {stats.monthlyStats.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-bold text-hwaseong-text mb-4">월별 강의 완료 현황</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.monthlyStats} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                    <Bar dataKey="count" name="강의 수" fill="#003087" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "전체 요청", value: stats.requests.total, color: "text-hwaseong-blue" },
                { label: "매칭 중", value: stats.requests.matched, color: "text-blue-500" },
                { label: "강의 완료", value: stats.requests.completed, color: "text-green-600" },
              ].map((s) => (
                <div key={s.label} className="bg-white rounded-2xl p-4 border border-gray-100 text-center">
                  <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* 강사 관리 탭 */}
        {tab === "leaders" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-hwaseong-text">강사 목록 ({leaders.length}명)</h3>
            </div>
            {leaders.map((leader) => (
              <div key={leader.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-hwaseong-blue/10 rounded-xl flex items-center justify-center text-xl font-bold text-hwaseong-blue flex-shrink-0">
                    {(leader.realName ?? leader.maskedName)[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold text-hwaseong-text">{leader.realName ?? leader.maskedName}</p>
                      {leader.isVerified
                        ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ 인증됨</span>
                        : <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">인증 대기</span>
                      }
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-2">
                      <span>{CERT_LABELS[leader.certLevel]}</span>
                      <span>⭐ {leader.ratingAvg.toFixed(1)}</span>
                      <span>강의 {leader.totalLectures}회</span>
                    </div>
                    {leader.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {leader.specialties.slice(0, 3).map((s) => (
                          <span key={s} className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {!leader.isVerified ? (
                      <>
                        <button onClick={() => handleVerify(leader.id, true, 2)} className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors">Lv.2 인증</button>
                        <button onClick={() => handleVerify(leader.id, true, 1)} className="text-xs bg-hwaseong-blue text-white px-3 py-1.5 rounded-lg hover:bg-blue-900 transition-colors">Lv.1 인증</button>
                      </>
                    ) : (
                      <button onClick={() => handleVerify(leader.id, false)} className="text-xs border border-red-300 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">인증 취소</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 요청 목록 탭 */}
        {tab === "requests" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-hwaseong-text">전체 매칭 요청 ({requests.length}건)</h3>
              <button onClick={() => setTab("matching")} className="text-xs bg-hwaseong-blue text-white px-3 py-1.5 rounded-lg">
                매칭하기 →
              </button>
            </div>
            {requests.map((req) => (
              <div key={req.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="font-semibold text-hwaseong-text text-sm">{req.title}</p>
                    <p className="text-xs text-gray-500">{req.client?.name}</p>
                  </div>
                  <StatusBadge status={req.status} />
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                  <span className="bg-gray-50 px-2 py-1 rounded-lg">🎯 {req.category}</span>
                  <span className="bg-gray-50 px-2 py-1 rounded-lg">📍 {req.address}</span>
                  <span className="bg-gray-50 px-2 py-1 rounded-lg">📅 {req.start_date}</span>
                  <span className="bg-gray-50 px-2 py-1 rounded-lg">👥 {req.participant_count}명</span>
                </div>
                {req.leader && (
                  <p className="text-xs text-blue-600 mt-2">배정 강사: {req.leader.realName ?? req.leader.maskedName}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 매칭 관리 탭 */}
        {tab === "matching" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-hwaseong-text">매칭 대기 요청 ({pendingRequests.length}건)</h3>
            </div>

            {pendingRequests.length === 0 && (
              <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 text-gray-400">
                <p className="text-4xl mb-3">🎉</p>
                <p className="text-sm font-medium">대기 중인 매칭 요청이 없습니다.</p>
              </div>
            )}

            {pendingRequests.map((req) => (
              <MatchRequestCard
                key={req.id}
                req={req}
                assignedReqId={assignedReqId}
                onAssign={() => { setSelectedReqForAssign(req); setMatchModal(true); setAssignedReqId(null); }}
              />
            ))}

            {/* 거절된 요청 섹션 */}
            {rejectedRequests.length > 0 && (
              <>
                <div className="flex items-center gap-3 pt-2">
                  <div className="flex-1 h-px bg-orange-200" />
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-base">⚠️</span>
                    <h3 className="font-bold text-orange-700 text-sm">
                      거절된 요청 — 재배정 필요 ({rejectedRequests.length}건)
                    </h3>
                  </div>
                  <div className="flex-1 h-px bg-orange-200" />
                </div>
                <p className="text-xs text-gray-400 text-center -mt-1">강사가 거절한 요청입니다. 다른 강사를 배정해 주세요.</p>
                {rejectedRequests.map((req) => (
                  <MatchRequestCard
                    key={req.id}
                    req={req}
                    assignedReqId={assignedReqId}
                    onAssign={() => { setSelectedReqForAssign(req); setMatchModal(true); setAssignedReqId(null); }}
                    rejected
                  />
                ))}
              </>
            )}
          </div>
        )}

        {/* 활동 보고 탭 */}
        {tab === "reports" && (
          <div className="space-y-3">
            <h3 className="font-bold text-hwaseong-text">전체 활동 보고서 ({reports.length}건)</h3>
            {reports.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="font-semibold text-hwaseong-text text-sm">{r.match?.title}</p>
                    <p className="text-xs text-gray-500">강사: {r.match?.leader?.profiles?.name} · {r.match?.address}</p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{r.lecture_date}</span>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-2">
                  <span>참석자 <strong className="text-hwaseong-text">{r.attendance_count}명</strong></span>
                  {r.rating_from_client !== null && (
                    <span>만족도 <strong className="text-amber-500">⭐ {r.rating_from_client}</strong></span>
                  )}
                </div>
                {r.report_text && <p className="text-xs text-gray-600 leading-relaxed">{r.report_text}</p>}
              </div>
            ))}
          </div>
        )}

      </DashboardLayout>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-white text-sm font-semibold transition-all animate-fade-up ${
          toast.ok ? "bg-green-600" : "bg-red-500"
        }`}>
          <span>{toast.ok ? "✅" : "❌"}</span>
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* 강사 배정 워크플로우 모달 */}
      {matchModal && selectedReqForAssign && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={(e) => { if (e.target === e.currentTarget) setMatchModal(false); }}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

            {/* 헤더 — 요청 정보 */}
            <div className="p-5 border-b border-gray-100 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-hwaseong-blue mb-1">강사 배정 워크플로우</p>
                <h3 className="font-bold text-hwaseong-text line-clamp-1">{selectedReqForAssign.title}</h3>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {selectedReqForAssign.address && (
                    <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">📍 {selectedReqForAssign.address}</span>
                  )}
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">🎯 {selectedReqForAssign.category}</span>
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">👥 {selectedReqForAssign.participant_count}명</span>
                  <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">📅 {selectedReqForAssign.start_date}</span>
                </div>
              </div>
              <button
                onClick={() => setMatchModal(false)}
                className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400"
              >✕</button>
            </div>

            {/* 검색창 */}
            <div className="px-4 pt-4 pb-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                <input
                  type="text"
                  value={leaderSearch}
                  onChange={(e) => setLeaderSearch(e.target.value)}
                  placeholder="이름 또는 전문 분야 검색"
                  className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30"
                />
                {leaderSearch && (
                  <button onClick={() => setLeaderSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">✕</button>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1.5 px-1">
                인증 완료·활동 중인 강사 {filteredModalLeaders.length}명
              </p>
            </div>

            {/* 강사 리스트 */}
            <div className="overflow-y-auto flex-1 px-4 pb-2 space-y-2">
              {filteredModalLeaders.length === 0 ? (
                <div className="text-center text-gray-400 py-10 text-sm">
                  <p className="text-3xl mb-2">🏅</p>
                  {leaderSearch ? "검색 결과가 없습니다." : "배정 가능한 강사가 없습니다."}
                </div>
              ) : (
                filteredModalLeaders.map((leader) => {
                  const isSelected = selectedLeaderId === leader.id;
                  return (
                    <button
                      key={leader.id}
                      onClick={() => setSelectedLeaderId(isSelected ? null : leader.id)}
                      className={`w-full text-left flex items-center gap-3 rounded-2xl p-4 border-2 transition-all ${
                        isSelected
                          ? "border-hwaseong-blue bg-blue-50 shadow-sm"
                          : "border-transparent bg-gray-50 hover:border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold flex-shrink-0 transition-colors ${
                        isSelected ? "bg-hwaseong-blue text-white" : "bg-hwaseong-blue/10 text-hwaseong-blue"
                      }`}>
                        {isSelected ? "✓" : (leader.realName ?? leader.maskedName)[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-hwaseong-text text-sm">{leader.realName ?? leader.maskedName}</p>
                        <div className="flex gap-2 text-xs text-gray-500 mt-0.5">
                          <span>{CERT_LABELS[leader.certLevel]}</span>
                          <span>⭐ {leader.ratingAvg.toFixed(1)}</span>
                          <span>강의 {leader.totalLectures}회</span>
                        </div>
                        {leader.specialties.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {leader.specialties.slice(0, 3).map((s) => (
                              <span key={s} className={`text-[10px] px-1.5 py-0.5 rounded ${isSelected ? "bg-blue-200 text-blue-800" : "bg-blue-100 text-blue-700"}`}>{s}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      {isSelected && <span className="flex-shrink-0 text-xs font-bold text-hwaseong-blue">선택됨</span>}
                    </button>
                  );
                })
              )}
            </div>

            {/* 하단 — 선택 요약 + 최종 배정 버튼 */}
            <div className="p-4 border-t border-gray-100 space-y-2">
              {selectedLeaderId && (() => {
                const picked = filteredModalLeaders.find((l) => l.id === selectedLeaderId);
                return picked ? (
                  <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
                    <span className="text-sm">✅</span>
                    <p className="text-xs text-blue-800 font-semibold flex-1">
                      {picked.realName ?? picked.maskedName} · {CERT_LABELS[picked.certLevel]}
                    </p>
                    <button onClick={() => setSelectedLeaderId(null)} className="text-blue-400 hover:text-blue-600 text-xs">변경</button>
                  </div>
                ) : null;
              })()}
              <button
                onClick={() => selectedLeaderId && doSimpleAssign(selectedReqForAssign, selectedLeaderId)}
                disabled={!selectedLeaderId || assigningId !== null}
                className="w-full py-3 bg-hwaseong-blue text-white text-sm font-bold rounded-xl hover:bg-blue-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {assigningId ? "배정 중..." : selectedLeaderId ? "최종 배정" : "강사를 선택해 주세요"}
              </button>
              <button
                onClick={() => setMatchModal(false)}
                className="w-full py-2 text-sm text-gray-400 rounded-xl hover:bg-gray-100 transition-colors"
              >취소</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function LiveMatchRow({
  req,
  assignedReqId,
  onAssign,
}: {
  req: MatchRequest;
  assignedReqId: string | null;
  onAssign: () => void;
}) {
  const isRejected = req.status === "rejected";
  const isMatched  = req.status === "matched";
  return (
    <div className={`flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors ${isRejected ? "border-l-4 border-red-400 bg-red-50/30" : ""}`}>
      <StatusBadge status={req.status} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-hwaseong-text text-sm truncate">{req.title}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-gray-500">
          {req.client?.name && <span>🏢 {req.client.name}</span>}
          {req.address && <span>📍 {req.address}</span>}
          <span>📅 {req.start_date}</span>
        </div>
        {assignedReqId === req.id && (
          <p className="text-[10px] text-green-600 font-semibold mt-0.5">✅ 배정 완료</p>
        )}
      </div>
      {(req.status === "pending" || req.status === "rejected") && (
        <button
          onClick={onAssign}
          className={`flex-shrink-0 px-3 py-1.5 text-xs font-bold text-white rounded-lg transition-colors ${
            isRejected ? "bg-orange-500 hover:bg-orange-600" : "bg-hwaseong-blue hover:bg-blue-900"
          }`}
        >
          {isRejected ? "재배정" : "배정"}
        </button>
      )}
      {isMatched && (
        <div className="flex-shrink-0 text-right">
          <p className="text-[10px] text-sky-600 font-semibold">⏳ 수락 대기</p>
          {req.leader && (
            <p className="text-[10px] text-gray-400 mt-0.5">{req.leader.realName ?? req.leader.maskedName}</p>
          )}
        </div>
      )}
    </div>
  );
}

function MatchRequestCard({
  req,
  assignedReqId,
  onAssign,
  rejected = false,
}: {
  req: MatchRequest;
  assignedReqId: string | null;
  onAssign: () => void;
  rejected?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-5 shadow-sm border ${rejected ? "bg-orange-50 border-orange-200" : "bg-white border-gray-100"}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-semibold text-hwaseong-text">{req.title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{req.client?.name}</p>
        </div>
        <StatusBadge status={req.status} />
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-3">
        <span className="bg-gray-50 px-2 py-1 rounded-lg">🎯 {req.category}</span>
        {req.address && <span className="bg-gray-50 px-2 py-1 rounded-lg">📍 {req.address}</span>}
        <span className="bg-gray-50 px-2 py-1 rounded-lg">📅 {req.start_date}</span>
        <span className="bg-gray-50 px-2 py-1 rounded-lg">👥 {req.participant_count}명</span>
      </div>
      {assignedReqId === req.id && (
        <p className="text-xs text-green-600 font-semibold mb-2">✅ 강사 배정이 완료되었습니다.</p>
      )}
      <button
        onClick={onAssign}
        className={`w-full py-2.5 text-white text-sm font-bold rounded-xl transition-colors ${
          rejected
            ? "bg-orange-500 hover:bg-orange-600"
            : "bg-hwaseong-blue hover:bg-blue-900"
        }`}
      >
        {rejected ? "다른 강사 재배정하기" : "강사 배정하기"}
      </button>
    </div>
  );
}

function calcRegionScore(leader: Leader | undefined, req: MatchRequest): number {
  if (!leader) return 0;
  return leader.availableRegions.some((r) => req.address?.includes(r) || r.includes(req.address ?? "")) ? 30 : 0;
}

function calcSpecialtyScore(leader: Leader | undefined, req: MatchRequest): number {
  if (!leader) return 0;
  const words = req.category.split(/[\s,]+/);
  const matched = leader.specialties.filter((s) => words.some((w) => s.includes(w) || w.includes(s)));
  return Math.min(matched.length * 15, 40);
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:   { label: "대기",    cls: "bg-amber-100 text-amber-700" },
    matched:   { label: "매칭됨",  cls: "bg-blue-100 text-blue-700" },
    ongoing:   { label: "진행 중", cls: "bg-green-100 text-green-700" },
    completed: { label: "완료",    cls: "bg-gray-100 text-gray-600" },
    cancelled: { label: "취소",    cls: "bg-red-50 text-red-500" },
    rejected:  { label: "거절됨",  cls: "bg-orange-100 text-orange-700" },
  };
  const s = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-500" };
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${s.cls}`}>{s.label}</span>;
}
