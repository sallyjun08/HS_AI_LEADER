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
  is_approved?: boolean;
  created_at?: string;
  client: { name: string } | null;
  leader: Leader | null;
};

type FeedLeader = {
  id: string;
  name: string;
  email: string;
  joinedAt: string;
  isVerified: boolean;
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

export default function AdminDashboard() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [requests, setRequests] = useState<MatchRequest[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [feedLeaders, setFeedLeaders] = useState<FeedLeader[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<{ accounts?: { leaders: { name: string; email: string; password: string }[]; client: { name: string; email: string; password: string } } } | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) router.replace("/login");
  }, [loading, user, router]);

  async function fetchAll() {
    const [s, rq, rp, ld] = await Promise.all([
      fetch("/api/admin/stats").then((r) => r.json()),
      fetch("/api/match-requests").then((r) => r.json()),
      fetch("/api/activity-reports").then((r) => r.json()),
      fetch("/api/admin/leaders/list").then((r) => r.json()),
    ]);
    setStats(s); setRequests(rq); setReports(rp);
    if (Array.isArray(ld)) setFeedLeaders(ld);
  }

  useEffect(() => {
    if (user) fetchAll();
  }, [user]);

  async function handleSeed() {
    setSeeding(true);
    setSeedResult(null);
    const res = await fetch("/api/admin/seed-data", { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setSeedResult(data);
      setToast({ msg: "샘플 데이터 생성 완료!", ok: true });
      fetchAll();
    } else {
      setToast({ msg: data.error ?? "생성 실패", ok: false });
    }
    setSeeding(false);
  }

  async function handleDeleteSeed() {
    setSeeding(true);
    setSeedResult(null);
    const res = await fetch("/api/admin/seed-data", { method: "DELETE" });
    const data = await res.json();
    setToast({ msg: data.message ?? (res.ok ? "삭제 완료" : "삭제 실패"), ok: res.ok });
    if (res.ok) fetchAll();
    setSeeding(false);
  }

  // 토스트 자동 소멸
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-hwaseong-blue border-t-transparent rounded-full animate-spin" /></div>;
  }

  const pendingRequests   = requests.filter((r) => r.status === "pending");
  const matchedRequests   = requests.filter((r) => r.status === "matched");
  const rejectedRequests  = requests.filter((r) => r.status === "rejected");
  const ongoingCount      = requests.filter((r) => r.status === "ongoing").length;
  const unverifiedLeaders = feedLeaders.filter((l) => !l.isVerified);
  const todayReports = reports.filter((r) => {
    const today = new Date().toDateString();
    return new Date(r.submitted_at).toDateString() === today;
  }).length;

  return (
    <>
      <Head><title>관리자 대시보드 | 화성 AI 시민리더 잇다</title></Head>
      <DashboardLayout pageTitle="통합 관제 대시보드">

        {/* 알림 현황 패널 */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              count: rejectedRequests.length,
              label: "재배정 필요",
              sub: "강사 거절 → 즉시 재매칭",
              href: "/admin/matching-center",
              urgent: true,
              activeColor: "bg-red-500",
              activeBorder: "border-red-300",
              activeBg: "bg-red-50",
              activeText: "text-red-700",
              activeSub: "text-red-400",
              icon: "⚠️",
            },
            {
              count: pendingRequests.length,
              label: "강의 요청 대기",
              sub: "강사 배정이 필요합니다",
              href: "/admin/matching-center",
              urgent: false,
              activeColor: "bg-amber-500",
              activeBorder: "border-amber-300",
              activeBg: "bg-amber-50",
              activeText: "text-amber-700",
              activeSub: "text-amber-400",
              icon: "📥",
            },
            {
              count: unverifiedLeaders.length,
              label: "강사 인증 대기",
              sub: "자격증 검토 후 인증 처리",
              href: "/admin/leaders",
              urgent: false,
              activeColor: "bg-hwaseong-blue",
              activeBorder: "border-blue-300",
              activeBg: "bg-blue-50",
              activeText: "text-blue-700",
              activeSub: "text-blue-400",
              icon: "🏅",
            },
          ].map((item) => {
            const hasAlert = item.count > 0;
            return (
              <a
                key={item.label}
                href={item.href}
                className={`relative flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all hover:shadow-md ${
                  hasAlert
                    ? `${item.activeBg} ${item.activeBorder} shadow-sm`
                    : "bg-white border-gray-100"
                }`}
              >
                {hasAlert && item.urgent && (
                  <span className="absolute top-2 right-2 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                )}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                  hasAlert ? item.activeColor : "bg-gray-100"
                }`}>
                  {hasAlert ? (
                    <span className="text-white font-black text-sm">{item.count}</span>
                  ) : (
                    <span>{item.icon}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-bold leading-tight ${hasAlert ? item.activeText : "text-gray-400"}`}>
                    {item.label}
                  </p>
                  <p className={`text-[10px] mt-0.5 ${hasAlert ? item.activeSub : "text-gray-300"}`}>
                    {hasAlert ? item.sub : "처리할 항목 없음"}
                  </p>
                </div>
                {hasAlert && <span className={`ml-auto text-xs flex-shrink-0 ${item.activeText}`}>→</span>}
              </a>
            );
          })}
        </div>

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

        {/* 통계 */}
        {stats && (
          <>
            {/* ── 상단 요약 카드 4개 ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

              {/* 매칭 대기 중 */}
              <div className="bg-white rounded-2xl p-5 border border-amber-100 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-lg">📥</div>
                  {pendingRequests.length > 0
                    ? <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-1 rounded-lg animate-pulse">처리 필요</span>
                    : <span className="text-xs font-semibold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">없음</span>
                  }
                </div>
                <p className="text-3xl font-black text-hwaseong-text">{pendingRequests.length}</p>
                <p className="text-sm font-semibold text-gray-600 mt-1">매칭 대기 중</p>
                <p className="text-xs text-gray-400 mt-0.5">강사 배정이 필요한 요청</p>
              </div>

              {/* 진행 중인 강의 */}
              <div className="bg-white rounded-2xl p-5 border border-green-100 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-lg">▶️</div>
                  <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-lg">진행</span>
                </div>
                <p className="text-3xl font-black text-hwaseong-text">{ongoingCount}</p>
                <p className="text-sm font-semibold text-gray-600 mt-1">진행 중인 강의</p>
                <p className="text-xs text-gray-400 mt-0.5">현재 수업이 열린 건수</p>
              </div>

              {/* 오늘 제출된 보고서 */}
              <div className="bg-white rounded-2xl p-5 border border-sky-100 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center text-lg">📄</div>
                  <span className="text-xs font-semibold text-sky-700 bg-sky-50 px-2 py-1 rounded-lg">오늘</span>
                </div>
                <p className="text-3xl font-black text-hwaseong-text">{todayReports}</p>
                <p className="text-sm font-semibold text-gray-600 mt-1">오늘 제출된 보고서</p>
                <p className="text-xs text-gray-400 mt-0.5">금일 활동 보고 건수</p>
              </div>

              {/* 재배정 필요 — 빨간색 경고 */}
              <div className={`rounded-2xl p-5 border shadow-sm relative overflow-hidden ${
                rejectedRequests.length > 0 ? "bg-red-50 border-red-200" : "bg-white border-gray-100"
              }`}>
                {rejectedRequests.length > 0 && (
                  <div className="absolute inset-0 bg-red-400/5 animate-pulse pointer-events-none" />
                )}
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                    rejectedRequests.length > 0 ? "bg-red-200" : "bg-gray-100"
                  }`}>⚠️</div>
                  {rejectedRequests.length > 0
                    ? <span className="text-xs font-bold text-red-700 bg-red-100 px-2 py-1 rounded-lg animate-pulse">즉시 처리</span>
                    : <span className="text-xs font-semibold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">정상</span>
                  }
                </div>
                <p className={`text-3xl font-black ${rejectedRequests.length > 0 ? "text-red-600" : "text-hwaseong-text"}`}>
                  {rejectedRequests.length}
                </p>
                <p className={`text-sm font-semibold mt-1 ${rejectedRequests.length > 0 ? "text-red-700" : "text-gray-600"}`}>
                  재배정 필요
                </p>
                <p className={`text-xs mt-0.5 ${rejectedRequests.length > 0 ? "text-red-500 font-semibold" : "text-gray-400"}`}>
                  {rejectedRequests.length > 0 ? `강사 거절 → 재배정 필요` : "모든 매칭 정상"}
                </p>
              </div>
            </div>

            {/* ── 차트 + 현황 카드 ── */}
            <div className="space-y-6">

              {/* 바 차트 — 월별 교육 진행 현황 */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-hwaseong-text">월별 교육 진행 현황</h3>
                    <p className="text-xs text-gray-400 mt-0.5">강의 완료(completed) 기준</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-hwaseong-blue" />
                    <span className="text-xs text-gray-500">강의 완료 수</span>
                  </div>
                </div>
                {stats.monthlyStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={stats.monthlyStats} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, fontSize: 12 }}
                        formatter={(v) => [`${v ?? 0}건`, "강의 완료"]}
                      />
                      <Bar dataKey="count" name="강의 완료" fill="#003087" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-48 flex flex-col items-center justify-center text-gray-300">
                    <p className="text-4xl mb-2">📊</p>
                    <p className="text-sm">완료된 강의 데이터가 없습니다.</p>
                  </div>
                )}
              </div>

              {/* 요청 상태 + 강사·수강생 현황 */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "전체 요청", value: stats.requests.total,    color: "text-hwaseong-blue", icon: "📋", bg: "bg-blue-50" },
                  { label: "매칭 진행", value: stats.requests.matched,   color: "text-sky-600",       icon: "🔗", bg: "bg-sky-50" },
                  { label: "강의 완료", value: stats.requests.completed, color: "text-green-600",     icon: "🎓", bg: "bg-green-50" },
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-2xl p-4 border border-gray-100 text-center">
                    <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center text-base mx-auto mb-2`}>{s.icon}</div>
                    <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-400 mt-1">{s.label}</p>
                  </div>
                ))}
                <div className="bg-white rounded-2xl p-4 border border-gray-100 text-center">
                  <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center text-base mx-auto mb-2">⭐</div>
                  <p className="text-3xl font-black text-amber-500">{stats.reports.avgSatisfaction}</p>
                  <p className="text-xs text-gray-400 mt-1">평균 만족도</p>
                </div>
              </div>

              {/* 강사 현황 + 수강생 현황 */}
              <div className="grid lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">강사 현황</h4>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">전체 강사</span>
                      <span className="text-sm font-bold text-hwaseong-text">{stats.leaders.total}명</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">인증 완료</span>
                      <span className="text-sm font-bold text-green-600">{stats.leaders.verified}명</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">인증 대기</span>
                      <span className="text-sm font-bold text-amber-600">{stats.leaders.total - stats.leaders.verified}명</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all duration-700"
                        style={{ width: stats.leaders.total > 0 ? `${(stats.leaders.verified / stats.leaders.total) * 100}%` : "0%" }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 text-right">
                      인증률 {stats.leaders.total > 0 ? Math.round((stats.leaders.verified / stats.leaders.total) * 100) : 0}%
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">수강생 현황</h4>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">누적 수강생</span>
                      <span className="text-sm font-bold text-hwaseong-text">{stats.reports.totalAttendees}명</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">전체 보고서</span>
                      <span className="text-sm font-bold text-sky-600">{stats.reports.total}건</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 요청 현황 요약 + 바로가기 ── */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-hwaseong-text">요청 파이프라인 현황</h3>
                <a
                  href="/admin/requests"
                  className="text-xs text-hwaseong-blue hover:underline font-semibold"
                >
                  전체 보기 →
                </a>
              </div>
              <div className="grid grid-cols-3 divide-x divide-gray-100">
                {[
                  { label: "강의 요청",   count: pendingRequests.length,  icon: "📥", bg: "bg-amber-50",  text: "text-amber-700",  href: "/admin/matching-center",  urgent: pendingRequests.length > 0 },
                  { label: "수락 대기",   count: matchedRequests.length,  icon: "⏳", bg: "bg-sky-50",    text: "text-sky-700",    href: "/admin/requests",         urgent: false },
                  { label: "재배정 필요", count: rejectedRequests.length, icon: "⚠️", bg: "bg-red-50",    text: "text-red-700",    href: "/admin/matching-center",  urgent: rejectedRequests.length > 0 },
                ].map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    className={`py-5 px-3 text-center block hover:brightness-95 transition-all ${s.bg}`}
                  >
                    <p className="text-2xl mb-1">{s.icon}</p>
                    <p className={`text-3xl font-black ${s.text} leading-none`}>{s.count}</p>
                    <p className={`text-xs font-semibold mt-1 ${s.text}`}>{s.label}</p>
                    {s.urgent && s.count > 0 && (
                      <p className="text-[10px] text-red-500 font-bold mt-0.5 animate-pulse">처리 필요</p>
                    )}
                  </a>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── 샘플 데이터 ─────────────────────────────────────────────────── */}
        <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-500">개발자 도구 — 샘플 데이터</h3>
              <p className="text-xs text-gray-400 mt-0.5">매칭 알고리즘 테스트용 강사 5명 + 수요처 1명 + 대기 요청 3건 생성</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="px-4 py-2 bg-hwaseong-blue text-white text-xs font-bold rounded-xl hover:bg-blue-900 disabled:opacity-50 transition-colors"
              >
                {seeding ? "처리 중..." : "샘플 생성"}
              </button>
              <button
                onClick={handleDeleteSeed}
                disabled={seeding}
                className="px-4 py-2 bg-red-100 text-red-600 text-xs font-bold rounded-xl hover:bg-red-200 disabled:opacity-50 transition-colors"
              >
                샘플 삭제
              </button>
            </div>
          </div>

          {seedResult?.accounts && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-bold text-gray-500 mb-1">생성된 테스트 계정 (비밀번호: Test1234!)</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {seedResult.accounts.leaders.map((l) => (
                  <div key={l.email} className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs">
                    <p className="font-bold text-hwaseong-text">{l.name}</p>
                    <p className="text-gray-400 truncate">{l.email}</p>
                  </div>
                ))}
                <div className="bg-white border border-green-200 rounded-xl px-3 py-2 text-xs">
                  <p className="font-bold text-green-700">{seedResult.accounts.client.name}</p>
                  <p className="text-gray-400 truncate">{seedResult.accounts.client.email}</p>
                </div>
              </div>
            </div>
          )}
        </div>

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

    </>
  );
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
