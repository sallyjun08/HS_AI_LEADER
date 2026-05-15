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

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch("/api/admin/stats").then((r) => r.json()),
      fetch("/api/leaders").then((r) => r.json()),
      fetch("/api/match-requests").then((r) => r.json()),
      fetch("/api/activity-reports").then((r) => r.json()),
    ]).then(([s, l, rq, rp]) => {
      setStats(s); setLeaders(l); setRequests(rq); setReports(rp);
    });
  }, [user]);

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

  const pendingRequests = requests.filter((r) => r.status === "pending");

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
              {t === "stats" ? "📊 통계" : t === "leaders" ? "🏅 강사 관리" : t === "requests" ? "📋 요청 목록" : t === "matching" ? "🔗 스마트 매칭" : "📄 활동 보고"}
            </button>
          ))}
        </div>

        {/* 통계 탭 */}
        {tab === "stats" && stats && (
          <>
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

        {/* 스마트 매칭 탭 */}
        {tab === "matching" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="space-y-3">
              <h3 className="font-bold text-hwaseong-text">매칭 대기 요청</h3>
              {pendingRequests.length === 0 && (
                <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 text-gray-400">
                  <p className="text-3xl mb-3">🎉</p>
                  <p className="text-sm">모든 요청이 처리되었습니다.</p>
                </div>
              )}
              {pendingRequests.map((req) => (
                <button
                  key={req.id}
                  onClick={() => selectRequestForMatching(req)}
                  className={`w-full text-left bg-white rounded-2xl p-4 shadow-sm border-2 transition-all ${
                    selectedReq?.id === req.id ? "border-hwaseong-blue" : "border-gray-100 hover:border-gray-200"
                  }`}
                >
                  <p className="font-semibold text-hwaseong-text text-sm">{req.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{req.client?.name} · {req.address}</p>
                  <div className="flex gap-2 mt-2 text-xs text-gray-400">
                    <span>🎯 {req.category}</span>
                    <span>📅 {req.start_date}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-hwaseong-text">
                {selectedReq ? "AI 추천 강사" : "요청을 선택하면 AI가 강사를 추천합니다"}
              </h3>

              {matchSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-green-700 text-sm font-semibold text-center">
                  ✅ 매칭이 완료되었습니다. 강사에게 매칭이 통보됩니다.
                </div>
              )}

              {selectedReq && !matchSuccess && (
                <>
                  {scoredLeaders.length === 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-700 text-sm">
                      인증된 강사가 없습니다. 먼저 강사 인증을 진행해 주세요.
                    </div>
                  )}

                  {scoredLeaders.map((leader, idx) => (
                    <div key={leader.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${
                          idx === 0 ? "bg-amber-500" : idx === 1 ? "bg-gray-400" : "bg-orange-400"
                        }`}>
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-hwaseong-text text-sm">{leader.realName ?? leader.maskedName}</p>
                            {leader.isVerified && <span className="text-xs text-green-600">✓ 인증</span>}
                          </div>
                          <div className="flex gap-2 text-xs text-gray-500 mt-0.5">
                            <span>⭐ {leader.ratingAvg.toFixed(1)}</span>
                            <span>강의 {leader.totalLectures}회</span>
                            <span>{CERT_LABELS[leader.certLevel]}</span>
                          </div>
                          {leader.specialties.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {leader.specialties.slice(0, 3).map((s) => (
                                <span key={s} className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{s}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-lg font-black text-hwaseong-blue">{leader.matchScore}점</p>
                          <p className="text-[10px] text-gray-400">매칭 점수</p>
                        </div>
                      </div>
                      <button
                        onClick={() => doMatch(leader.id)}
                        disabled={matching}
                        className="w-full py-2.5 bg-hwaseong-blue text-white text-xs font-bold rounded-xl hover:bg-blue-900 transition-colors disabled:opacity-60"
                      >
                        {matching ? "매칭 중..." : "이 강사로 매칭하기"}
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
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
    </>
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
