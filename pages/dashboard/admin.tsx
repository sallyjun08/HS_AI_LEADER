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
  lecture_type: "oneday" | "intensive" | "longterm" | null;
  session_count: number | null;
  lecture_hours: number | null;
  target_age: string | null;
  participant_count: number;
  start_date: string;
  end_date: string | null;
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
  match_id: string;
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
  const [testClientBusy, setTestClientBusy] = useState(false);
  const [testClientResult, setTestClientResult] = useState<{ email: string; password: string } | null>(null);
  const [showOngoingModal, setShowOngoingModal] = useState(false);

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

  async function handleCreateTestClient() {
    setTestClientBusy(true);
    setTestClientResult(null);
    const res = await fetch("/api/admin/create-test-client", { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setTestClientResult({ email: data.email, password: data.password });
      setToast({ msg: "테스트 수요처 계정 생성 완료!", ok: true });
    } else {
      setToast({ msg: data.error ?? "생성 실패", ok: false });
    }
    setTestClientBusy(false);
  }

  async function handleDeleteTestClient() {
    setTestClientBusy(true);
    setTestClientResult(null);
    const res = await fetch("/api/admin/create-test-client", { method: "DELETE" });
    const data = await res.json();
    setToast({ msg: data.message ?? (res.ok ? "삭제 완료" : "삭제 실패"), ok: res.ok });
    setTestClientBusy(false);
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

  const pendingRequests        = requests.filter((r) => r.status === "pending");
  const reviewRequests         = requests.filter((r) => r.status === "pending" && r.is_approved === false);
  const matchingQueueRequests  = requests.filter((r) => r.status === "pending" && r.is_approved === true);
  const matchedRequests        = requests.filter((r) => r.status === "matched");
  const rejectedRequests       = requests.filter((r) => r.status === "rejected");
  const ongoingRequests        = requests.filter((r) => r.status === "ongoing");
  const ongoingCount           = ongoingRequests.length;
  const submittedCountByMatch = reports.reduce<Record<string, number>>((acc, r) => {
    if (r.match_id) acc[r.match_id] = (acc[r.match_id] ?? 0) + 1;
    return acc;
  }, {});
  const todayReports = reports.filter((r) => {
    const today = new Date().toDateString();
    return new Date(r.submitted_at).toDateString() === today;
  }).length;

  return (
    <>
      <Head><title>관리자 대시보드 | 화성 AI 시민리더 잇다</title></Head>
      <DashboardLayout pageTitle="통합 관제 대시보드">

        {/* 알림 현황 패널 */}
        {(() => {
          const hasAlert = rejectedRequests.length > 0;
          return (
            <a
              href="/admin/matching-center"
              className={`relative flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all hover:shadow-md ${
                hasAlert ? "bg-red-50 border-red-300 shadow-sm" : "bg-white border-gray-100"
              }`}
            >
              {hasAlert && (
                <span className="absolute top-2 right-2 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
              )}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                hasAlert ? "bg-red-500" : "bg-gray-100"
              }`}>
                {hasAlert ? (
                  <span className="text-white font-black text-sm">{rejectedRequests.length}</span>
                ) : (
                  <span>⚠️</span>
                )}
              </div>
              <div className="min-w-0">
                <p className={`text-xs font-bold leading-tight ${hasAlert ? "text-red-700" : "text-gray-400"}`}>
                  재배정 필요
                </p>
                <p className={`text-[10px] mt-0.5 ${hasAlert ? "text-red-400" : "text-gray-300"}`}>
                  {hasAlert ? "강사 거절 → 즉시 재매칭" : "처리할 항목 없음"}
                </p>
              </div>
              {hasAlert && <span className="ml-auto text-xs flex-shrink-0 text-red-700">→</span>}
            </a>
          );
        })()}

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
            {/* ── 상단 요약 카드 5개 ── */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">

              {/* 요청 검토 — 액션 카드 (조건부 스타일) */}
              <StatActionCard
                icon="🔍"
                label="요청 검토"
                sub="수요처 신규 요청"
                count={reviewRequests.length}
                alertLabel="검토 필요"
                colorClass={{ bg: "bg-violet-50", border: "border-violet-200", iconBg: "bg-violet-200", text: "text-violet-700", badgeBg: "bg-violet-100", sub: "text-violet-500" }}
              />

              {/* 매칭 대기 중 — 액션 카드 (승인 완료 후 강사 미배정) */}
              <StatActionCard
                icon="📥"
                label="매칭 대기 중"
                sub="강사 배정 대기"
                count={matchingQueueRequests.length}
                alertLabel="배정 필요"
                colorClass={{ bg: "bg-amber-50", border: "border-amber-200", iconBg: "bg-amber-200", text: "text-amber-700", badgeBg: "bg-amber-100", sub: "text-amber-500" }}
              />

              {/* 진행 중인 강의 — 정보 카드 (클릭 시 모달) */}
              <StatInfoCard
                icon="▶️"
                label="진행 중인 강의"
                sub="현재 수업 중인 건수"
                value={ongoingCount}
                badge="진행"
                colorClass={{ border: "border-green-100", iconBg: "bg-green-100", badgeText: "text-green-700", badgeBg: "bg-green-50" }}
                onClick={ongoingCount > 0 ? () => setShowOngoingModal(true) : undefined}
              />

              {/* 오늘 제출된 보고서 — 정보 카드 (고정 스타일) */}
              <StatInfoCard
                icon="📄"
                label="오늘 제출된 보고서"
                sub="금일 활동 보고 건수"
                value={todayReports}
                badge="오늘"
                colorClass={{ border: "border-sky-100", iconBg: "bg-sky-100", badgeText: "text-sky-700", badgeBg: "bg-sky-50" }}
              />

              {/* 재배정 필요 — 액션 카드 (조건부 스타일) */}
              <StatActionCard
                icon="⚠️"
                label="재배정 필요"
                sub={rejectedRequests.length > 0 ? "강사 거절 → 재배정 필요" : "모든 매칭 정상"}
                count={rejectedRequests.length}
                alertLabel="즉시 처리"
                colorClass={{ bg: "bg-red-50", border: "border-red-200", iconBg: "bg-red-200", text: "text-red-700", badgeBg: "bg-red-100", sub: "text-red-500" }}
              />
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

        {/* ── 테스트 수요처 계정 ─────────────────────────────────────────────── */}
        <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-500">개발자 도구 — 테스트 수요처 계정</h3>
              <p className="text-xs text-gray-400 mt-0.5">수요처 플로우 테스트용 계정 생성/삭제 (client@test.aitda)</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateTestClient}
                disabled={testClientBusy}
                className="px-4 py-2 bg-hwaseong-blue text-white text-xs font-bold rounded-xl hover:bg-blue-900 disabled:opacity-50 transition-colors"
              >
                {testClientBusy ? "처리 중..." : "계정 생성"}
              </button>
              <button
                onClick={handleDeleteTestClient}
                disabled={testClientBusy}
                className="px-4 py-2 bg-red-100 text-red-600 text-xs font-bold rounded-xl hover:bg-red-200 disabled:opacity-50 transition-colors"
              >
                계정 삭제
              </button>
            </div>
          </div>

          {testClientResult && (
            <div className="mt-3">
              <p className="text-xs font-bold text-gray-500 mb-1">생성된 테스트 수요처 계정</p>
              <div className="bg-white border border-green-200 rounded-xl px-3 py-2 text-xs inline-flex flex-col gap-0.5">
                <p className="font-bold text-green-700">테스트 수요처</p>
                <p className="text-gray-500">이메일: <span className="font-mono">{testClientResult.email}</span></p>
                <p className="text-gray-500">비밀번호: <span className="font-mono">{testClientResult.password}</span></p>
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

      {/* 진행 중인 강의 모달 */}
      {showOngoingModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={(e) => { if (e.target === e.currentTarget) setShowOngoingModal(false); }}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            {/* 헤더 */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-hwaseong-text">진행 중인 강의</h3>
                <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                  {ongoingRequests.length}건
                </span>
              </div>
              <button
                onClick={() => setShowOngoingModal(false)}
                className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* 목록 */}
            <div className="overflow-y-auto divide-y divide-gray-50 flex-1">
              {ongoingRequests.map((r) => {
                const leaderName = (r.leader as { profiles?: { name?: string } } | null)?.profiles?.name ?? "—";
                const submitted  = submittedCountByMatch[r.id] ?? 0;
                const total      = r.session_count ?? 1;
                const isMulti    = r.lecture_type === "longterm" || r.lecture_type === "intensive";
                const pct        = isMulti ? Math.min(100, Math.round((submitted / total) * 100)) : null;

                const typeLabel =
                  r.lecture_type === "longterm"  ? { label: "장기정기형", cls: "bg-green-100 text-green-700" } :
                  r.lecture_type === "intensive" ? { label: "집중코스형", cls: "bg-yellow-100 text-yellow-700" } :
                  r.lecture_type === "oneday"    ? { label: "원데이형",   cls: "bg-blue-100 text-blue-700" } :
                  null;

                return (
                  <div key={r.id} className="px-5 py-4 hover:bg-gray-50/60 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          {typeLabel && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeLabel.cls}`}>
                              {typeLabel.label}
                            </span>
                          )}
                          <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            {r.category}
                          </span>
                        </div>
                        <p className="text-sm font-bold text-hwaseong-text leading-snug">{r.title}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5 text-xs text-gray-500">
                          <span>👨‍🏫 {leaderName}</span>
                          <span>🏢 {r.client?.name ?? "—"}</span>
                          {r.address && <span>📍 {r.address}</span>}
                          <span>👥 {r.participant_count}명</span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1">
                          {r.start_date}{r.end_date && r.end_date !== r.start_date ? ` ~ ${r.end_date}` : ""}
                        </p>
                        {isMulti && pct !== null && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[10px] font-bold text-green-700 flex-shrink-0">
                              {submitted}/{total}회 · {pct}%
                            </span>
                          </div>
                        )}
                      </div>
                      {!isMulti && (
                        <span className="flex-shrink-0 text-[10px] font-bold text-green-700 bg-green-50 border border-green-100 px-2.5 py-1 rounded-xl self-center">
                          진행 중
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 푸터 */}
            <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
              <a
                href="/admin/requests"
                className="block w-full py-2.5 text-center text-sm font-bold text-hwaseong-blue bg-hwaseong-blue/5 border border-hwaseong-blue/20 rounded-2xl hover:bg-hwaseong-blue/10 transition-colors"
              >
                전체 요청 관리 →
              </a>
            </div>
          </div>
        </div>
      )}

    </>
  );
}

type ActionColorClass = {
  bg: string; border: string; iconBg: string; text: string; badgeBg: string; sub: string;
};

function StatActionCard({ icon, label, sub, count, alertLabel, colorClass }: {
  icon: string; label: string; sub: string; count: number; alertLabel: string; colorClass: ActionColorClass;
}) {
  const active = count > 0;
  return (
    <div className={`rounded-2xl border p-4 flex flex-col gap-3 transition-colors ${active ? `${colorClass.bg} ${colorClass.border}` : "bg-white border-gray-100"}`}>
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${active ? colorClass.iconBg : "bg-gray-100"}`}>
          {icon}
        </div>
        {active && (
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${colorClass.badgeBg} ${colorClass.text}`}>
            {alertLabel}
          </span>
        )}
      </div>
      <div>
        <p className={`text-3xl font-black leading-none ${active ? colorClass.text : "text-gray-300"}`}>{count}</p>
        <p className={`text-xs font-semibold mt-1 ${active ? colorClass.text : "text-gray-400"}`}>{label}</p>
        <p className={`text-[11px] mt-0.5 ${active ? colorClass.sub : "text-gray-300"}`}>{sub}</p>
      </div>
    </div>
  );
}

type InfoColorClass = {
  border: string; iconBg: string; badgeText: string; badgeBg: string;
};

function StatInfoCard({ icon, label, sub, value, badge, colorClass, onClick }: {
  icon: string; label: string; sub: string; value: number; badge: string; colorClass: InfoColorClass;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`bg-white rounded-2xl border p-4 flex flex-col gap-3 ${colorClass.border} ${onClick ? "cursor-pointer hover:shadow-md transition-shadow text-left w-full" : ""}`}
    >
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${colorClass.iconBg}`}>
          {icon}
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${colorClass.badgeBg} ${colorClass.badgeText}`}>
          {badge}
        </span>
      </div>
      <div>
        <p className="text-3xl font-black leading-none text-hwaseong-text">{value}</p>
        <p className="text-xs font-semibold mt-1 text-gray-600">{label}</p>
        <p className="text-[11px] mt-0.5 text-gray-400">{onClick ? "클릭해서 목록 보기" : sub}</p>
      </div>
    </Tag>
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
