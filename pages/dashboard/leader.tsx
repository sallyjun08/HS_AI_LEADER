import Head from "next/head";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/lib/auth-context";
import DashboardLayout from "@/components/DashboardLayout";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type MatchRequest = {
  id: string;
  start_date: string;
  status: string;
};

type Report = {
  id: string;
  match_id: string;
  lecture_date: string;
  attendance_count: number;
  rating_from_client: number | null;
  admin_approved_at: string | null;
};

export default function LeaderDashboard() {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();

  const [matches, setMatches] = useState<MatchRequest[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== "leader")) router.replace("/login");
  }, [loading, user, router]);

  // 관리자 인증 처리 후 세션에 반영: 마운트 + 탭 포커스 복귀 + 30초 폴링
  useEffect(() => {
    refresh();
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    const pollId = setInterval(refresh, 30_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(pollId);
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (router.query.reportSuccess === "1") {
      setToast({ msg: "포트폴리오에 새로운 이력이 추가되었습니다 🎉", ok: true });
      router.replace("/dashboard/leader", undefined, { shallow: true });
    }
  }, [router.query.reportSuccess]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch("/api/match-requests").then((r) => r.json()),
      fetch("/api/activity-reports").then((r) => r.json()),
    ]).then(([m, r]) => {
      if (Array.isArray(m)) setMatches(m);
      if (Array.isArray(r)) setReports(r);
    });
  }, [user]);

  const pendingMatches   = useMemo(() => matches.filter((m) => m.status === "matched"), [matches]);
  const ongoingMatches   = useMemo(() => matches.filter((m) => m.status === "ongoing"), [matches]);
  const completedMatches = useMemo(() => matches.filter((m) => m.status === "completed"), [matches]);
  const submittedIds     = useMemo(() => new Set(reports.map((r) => r.match_id)), [reports]);
  const eligibleMatches  = useMemo(
    () => [...pendingMatches, ...ongoingMatches].filter((m) => !submittedIds.has(m.id)),
    [pendingMatches, ongoingMatches, submittedIds]
  );

  const totalAttendees = useMemo(() => reports.reduce((s, r) => s + r.attendance_count, 0), [reports]);
  const ratedReports   = useMemo(() => reports.filter((r) => r.rating_from_client !== null), [reports]);
  const avgRating      = ratedReports.length
    ? (ratedReports.reduce((s, r) => s + Number(r.rating_from_client), 0) / ratedReports.length).toFixed(1)
    : null;

  const chartData = useMemo(() => {
    const monthly: Record<string, number> = {};
    reports.forEach((r) => {
      const key = (r.lecture_date ?? "").slice(0, 7);
      if (key) monthly[key] = (monthly[key] ?? 0) + 1;
    });
    return Object.entries(monthly)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);
  }, [reports]);

  const pendingApprovalCount = useMemo(() => reports.filter((r) => r.admin_approved_at === null).length, [reports]);

  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisMonthCount = useMemo(
    () => matches.filter((m) => m.start_date.startsWith(thisMonth) && m.status !== "cancelled" && m.status !== "rejected").length,
    [matches, thisMonth]
  );

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-hwaseong-blue border-t-transparent rounded-full animate-spin" /></div>;
  }

  const lp = user.leaderProfile;
  const maxClassesMonth = lp?.maxClassesMonth ?? 10;
  const remainingThisMonth = Math.max(0, maxClassesMonth - thisMonthCount);

  return (
    <>
      <Head><title>AI 시민 리더 대시보드 | 화성 AI 시민리더 잇다</title></Head>
      <DashboardLayout pageTitle="현황">

        {/* 프로필 히어로 */}
        <div className="bg-gradient-to-br from-hwaseong-blue via-[#003fa3] to-indigo-700 rounded-3xl overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 bg-white/20 border-2 border-white/40 rounded-2xl flex items-center justify-center text-4xl font-black text-white">
                  {user.name[0]}
                </div>
                {lp?.isVerified && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 rounded-full border-2 border-white flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-black text-white mb-1">{user.name}</h2>
                <p className="text-blue-200 text-sm mb-3">
                  {lp?.isVerified ? "✓ 화성특례시 공식 인증 강사" : "⏳ 인증 심사 대기 중"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {lp?.specialties.slice(0, 4).map((s) => (
                    <span key={s} className="text-xs bg-white/10 text-blue-100 border border-white/20 px-2.5 py-1 rounded-full">{s}</span>
                  ))}
                  {!lp?.isVerified && (
                    <span className="text-xs bg-amber-400/20 text-amber-200 border border-amber-400/30 px-2.5 py-1 rounded-full animate-pulse">인증 신청 대기</span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-black/20 border-t border-white/10 grid grid-cols-4 divide-x divide-white/10">
            {[
              { label: "총 강의",    value: `${reports.length}회` },
              { label: "누적 수강생", value: `${totalAttendees}명` },
              { label: "평균 평점",  value: avgRating ? `⭐ ${avgRating}` : "—" },
              { label: "활성 매칭",  value: `${pendingMatches.length + ongoingMatches.length}건` },
            ].map((s) => (
              <div key={s.label} className="py-3 text-center">
                <p className="text-white font-bold text-lg leading-tight">{s.value}</p>
                <p className="text-blue-300 text-xs">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 요약 통계 카드 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="w-9 h-9 bg-hwaseong-blue/10 text-hwaseong-blue rounded-xl flex items-center justify-center text-base mb-2.5">📅</div>
            <div className="flex items-baseline gap-1">
              <p className="text-2xl font-black text-hwaseong-text">{remainingThisMonth}</p>
              <span className="text-xs text-gray-400">/ {maxClassesMonth}회</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">이번 달 남은 강의</p>
            <div className="mt-2.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-hwaseong-blue rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.round((thisMonthCount / maxClassesMonth) * 100))}%` }}
              />
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="w-9 h-9 bg-green-100 text-green-700 rounded-xl flex items-center justify-center text-base mb-2.5">📚</div>
            <p className="text-2xl font-black text-hwaseong-text">
              {completedMatches.length}<span className="text-sm font-normal text-gray-400 ml-0.5">회</span>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">누적 강의 수</p>
            <p className="text-[11px] text-gray-300 mt-1.5">{totalAttendees}명 수강</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="w-9 h-9 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center text-base mb-2.5">⭐</div>
            <p className="text-2xl font-black text-hwaseong-text">
              {avgRating ?? "—"}{avgRating && <span className="text-sm font-normal text-gray-400 ml-0.5">/ 5</span>}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">평균 평점</p>
            <p className="text-[11px] text-gray-300 mt-1.5">{ratedReports.length}건 평가됨</p>
          </div>
        </div>

        {/* 처리 필요 항목 */}
        {(pendingMatches.length > 0 || eligibleMatches.length > 0 || pendingApprovalCount > 0) && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">처리 필요 항목</h4>
            {pendingMatches.length > 0 && (
              <button
                onClick={() => router.push("/dashboard/leader/matches")}
                className="w-full flex items-center gap-3 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-left hover:bg-amber-100 transition-colors"
              >
                <span className="w-7 h-7 bg-amber-400 rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0">{pendingMatches.length}</span>
                <div>
                  <p className="text-xs font-bold text-amber-800">수락 대기 중인 매칭 요청</p>
                  <p className="text-[11px] text-amber-600">수락 또는 거절을 선택해 주세요</p>
                </div>
                <span className="ml-auto text-amber-500 text-xs">→</span>
              </button>
            )}
            {eligibleMatches.length > 0 && (
              <button
                onClick={() => router.push("/dashboard/leader/reports")}
                className="w-full flex items-center gap-3 px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-left hover:bg-blue-100 transition-colors"
              >
                <span className="w-7 h-7 bg-hwaseong-blue rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0">{eligibleMatches.length}</span>
                <div>
                  <p className="text-xs font-bold text-blue-800">활동 보고서 미제출 강의</p>
                  <p className="text-[11px] text-blue-600">보고서를 제출해 주세요</p>
                </div>
                <span className="ml-auto text-blue-500 text-xs">→</span>
              </button>
            )}
            {pendingApprovalCount > 0 && (
              <button
                onClick={() => router.push("/dashboard/leader/reports")}
                className="w-full flex items-center gap-3 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-left hover:bg-gray-100 transition-colors"
              >
                <span className="w-7 h-7 bg-gray-400 rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0">{pendingApprovalCount}</span>
                <div>
                  <p className="text-xs font-bold text-gray-700">관리자 승인 대기 중인 보고서</p>
                  <p className="text-[11px] text-gray-500">승인 완료 후 정산이 진행됩니다</p>
                </div>
                <span className="ml-auto text-gray-400 text-xs">→</span>
              </button>
            )}
          </div>
        )}

        {/* 포트폴리오 진입 */}
        <button
          onClick={() => router.push("/dashboard/leader/portfolio")}
          className="w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-hwaseong-blue/5 to-indigo-50 border border-hwaseong-blue/20 rounded-2xl hover:from-hwaseong-blue/10 hover:to-indigo-100 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-hwaseong-blue rounded-2xl flex items-center justify-center text-white text-lg group-hover:scale-105 transition-transform">🏆</div>
            <div className="text-left">
              <p className="text-sm font-bold text-hwaseong-text">내 포트폴리오 보기</p>
              <p className="text-xs text-gray-400">히트맵 · 레이더 차트 · 이력 · 활동 증명서</p>
            </div>
          </div>
          <span className="text-hwaseong-blue text-sm font-bold">→</span>
        </button>

        {/* 월별 강의 차트 */}
        {chartData.length > 0 ? (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-bold text-hwaseong-text mb-4 text-sm">최근 6개월 강의 현황</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={(v) => [`${v}회`, "강의"]} />
                <Bar dataKey="count" name="강의 횟수" fill="#003087" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 text-gray-300">
            <p className="text-4xl mb-2">📊</p>
            <p className="text-sm">아직 강의 실적이 없습니다.</p>
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
    </>
  );
}
