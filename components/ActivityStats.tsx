import { useEffect, useRef, useState } from "react";

function useCounter(end: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    started.current = false;
    setCount(0);
  }, [end]);

  useEffect(() => {
    const run = () => {
      if (started.current) return;
      started.current = true;
      let startTs: number | null = null;
      const tick = (ts: number) => {
        if (!startTs) startTs = ts;
        const elapsed = ts - startTs;
        const p = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setCount(Math.floor(eased * end));
        if (p < 1) requestAnimationFrame(tick);
        else setCount(end);
      };
      requestAnimationFrame(tick);
    };
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) run(); }, { threshold: 0.2 });
    if (ref.current) obs.observe(ref.current);
    const fb = setTimeout(run, 400);
    return () => { obs.disconnect(); clearTimeout(fb); };
  }, [end, duration]);

  return { count, ref };
}

interface StatsData {
  leaders: { total: number; verified: number };
  completedDispatches: number;
  reports: { total: number; totalAttendees: number };
  monthlyStats: { month: string; sessions: number; dispatches: number }[];
  regions: string[];
}

interface Achievement {
  achieved_at: string;
  title: string;
  description: string;
}

function StatCard({ end, suffix, label, icon, color }: { end: number; suffix: string; label: string; icon: string; color: string }) {
  const { count, ref } = useCounter(end);
  return (
    <div ref={ref} className={`bg-gradient-to-br ${color} rounded-2xl p-6 text-white shadow-lg hover:-translate-y-1 transition-transform`}>
      <span className="text-3xl block mb-3">{icon}</span>
      <p className="text-4xl font-bold tabular-nums mb-1">
        {count.toLocaleString()}{suffix}
      </p>
      <p className="text-sm text-white/80 font-medium">{label}</p>
    </div>
  );
}

function formatMonth(ym: string) {
  const [, m] = ym.split("-");
  return `${parseInt(m, 10)}월`;
}

export default function ActivityStats() {
  const [data, setData] = useState<StatsData | null>(null);
  const [achievements, setAchievements] = useState<Achievement[] | null>(null);

  useEffect(() => {
    fetch("/api/public/stats")
      .then((r) => r.json())
      .then((d: StatsData) => setData(d))
      .catch(() => {});
    fetch("/api/public/achievements")
      .then((r) => r.json())
      .then((d: Achievement[]) => setAchievements(d))
      .catch(() => {});
  }, []);

  const topStats = data
    ? [
        { end: data.leaders.verified,        suffix: "명", label: "활동 중인 AI 시민 리더", icon: "🏅", color: "from-blue-600 to-blue-800"     },
        { end: data.reports.total,            suffix: "회", label: "누적 교육 횟수",          icon: "📚", color: "from-indigo-500 to-blue-700"   },
        { end: data.reports.totalAttendees,   suffix: "명", label: "총 수강생",                icon: "👥", color: "from-sky-500 to-blue-600"      },
        { end: data.completedDispatches,      suffix: "건", label: "강사 파견 완료",           icon: "✅", color: "from-teal-500 to-cyan-700"     },
        { end: data.leaders.total,            suffix: "명", label: "등록 강사 수",             icon: "📋", color: "from-blue-500 to-indigo-600"   },
        { end: data.regions.length,           suffix: "개", label: "거점 운영 지역",           icon: "📍", color: "from-violet-500 to-blue-700"   },
      ]
    : Array(6).fill(null);

  const monthly = data?.monthlyStats ?? [];
  const maxSessions   = Math.max(...monthly.map((m) => m.sessions), 1);
  const maxDispatches = Math.max(...monthly.map((m) => m.dispatches), 1);

  const regions = data?.regions ?? [];

  return (
    <section id="stats" className="bg-gray-50 py-24 px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-14 text-center">
          <p className="text-hwaseong-skyblue text-sm font-semibold tracking-widest uppercase mb-3">
            Activity &amp; Statistics
          </p>
          <h2 className="text-4xl sm:text-5xl font-bold text-hwaseong-text tracking-tight">
            활동 현황
          </h2>
          <p className="text-gray-500 text-base mt-4">화성특례시 AI 혁신학교 AI랩 실시간 누적 데이터</p>
          <div className="w-12 h-1 bg-hwaseong-blue rounded-full mt-6 mx-auto" />
        </div>

        {/* Top stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-16">
          {topStats.map((s, i) =>
            s ? (
              <StatCard key={s.label} {...s} />
            ) : (
              <div key={i} className="rounded-2xl bg-gray-200 animate-pulse h-32" />
            )
          )}
        </div>

        {/* Charts + Regions row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-16">

          {/* Monthly bar chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h3 className="text-lg font-bold text-hwaseong-text mb-1">월별 교육 현황</h3>
            <p className="text-xs text-gray-400 mb-6">최근 6개월 교육 회차 및 파견 건수</p>
            {monthly.length > 0 ? (
              <>
                <div className="flex items-end justify-around gap-4 h-48">
                  {monthly.map((m) => (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs font-bold text-hwaseong-blue tabular-nums">{m.sessions}회</span>
                      <div className="w-full flex gap-1 items-end" style={{ height: "120px" }}>
                        <div
                          className="flex-1 bg-hwaseong-blue rounded-t-lg transition-all"
                          style={{ height: `${(m.sessions / maxSessions) * 100}%` }}
                        />
                        <div
                          className="flex-1 bg-hwaseong-skyblue/60 rounded-t-lg transition-all"
                          style={{ height: `${(m.dispatches / maxDispatches) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 font-medium">{formatMonth(m.month)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-6 mt-4 justify-center">
                  <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="w-3 h-3 rounded bg-hwaseong-blue inline-block" /> 교육 회차
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="w-3 h-3 rounded bg-hwaseong-skyblue/60 inline-block" /> 파견 건수
                  </span>
                </div>
              </>
            ) : (
              <div className="h-48 bg-gray-100 animate-pulse rounded-xl" />
            )}
          </div>

          {/* Region coverage */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col">
            <h3 className="text-lg font-bold text-hwaseong-text mb-1">거점 운영 지역</h3>
            <p className="text-xs text-gray-400 mb-6">강사 파견 서비스 운영 권역</p>
            {regions.length > 0 ? (
              <div className="flex flex-col gap-2 flex-1 overflow-y-auto max-h-64">
                {regions.map((r) => (
                  <div key={r} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <span className="w-2 h-2 rounded-full bg-hwaseong-blue flex-shrink-0" />
                    <span className="text-sm text-gray-700 font-medium">{r}</span>
                    <span className="ml-auto text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">운영 중</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2 flex-1">
                {Array(6).fill(0).map((_, i) => (
                  <div key={i} className="h-9 bg-gray-100 animate-pulse rounded-lg" />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Achievement timeline */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h3 className="text-lg font-bold text-hwaseong-text mb-1">주요 성과</h3>
          <p className="text-xs text-gray-400 mb-8">화성 AI 시민 리더 플랫폼 주요 이정표</p>
          {achievements === null ? (
            <div className="flex flex-col gap-6">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="flex items-start gap-6">
                  <div className="h-8 w-[76px] bg-gray-100 animate-pulse rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-4 bg-gray-100 animate-pulse rounded w-1/3" />
                    <div className="h-3 bg-gray-50 animate-pulse rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : achievements.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">등록된 성과가 없습니다.</p>
          ) : (
            <div className="relative">
              <div className="absolute left-[88px] top-0 bottom-0 w-px bg-gray-100" />
              <div className="flex flex-col gap-6">
                {achievements.map((a, i) => {
                  const [year, month] = a.achieved_at.split("-");
                  const label = `${year}.${month}`;
                  return (
                    <div key={i} className="flex items-start gap-6">
                      <span className="text-xs font-bold text-hwaseong-blue bg-blue-50 px-3 py-1.5 rounded-lg w-[76px] text-center flex-shrink-0">
                        {label}
                      </span>
                      <div className="relative flex items-start gap-4 pt-1">
                        <span className="w-3 h-3 rounded-full bg-hwaseong-blue border-2 border-white ring-2 ring-hwaseong-blue/20 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-hwaseong-text">{a.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{a.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>
    </section>
  );
}
