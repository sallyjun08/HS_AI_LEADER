import Head from "next/head";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/lib/auth-context";
import DashboardLayout from "@/components/DashboardLayout";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip,
} from "recharts";
import {
  Bird, Backpack, BookOpen, Pencil, GraduationCap,
  Briefcase, Home, Smile,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ─── 타입 ─────────────────────────────────────────────────────────────────────

type MatchRequest = {
  id: string;
  title: string;
  category: string;
  status: string;
  start_date: string;
  address: string | null;
  participant_count: number;
  /** 강사 매칭 시 강사의 전문 분야와 대조하는 핵심 파라미터로 사용됨 */
  target_audience: string[] | null;
  client: { name: string } | null;
};

type Report = {
  id: string;
  match_id: string;
  lecture_date: string;
  attendance_count: number;
  report_text: string | null;
  image_urls: string[];
  rating_from_client: number | null;
  submitted_at: string;
  admin_approved_at: string | null;
  match: { title: string; address: string | null; start_date: string } | null;
};

// ─── 상수 ─────────────────────────────────────────────────────────────────────

type AudienceTarget = { value: string; line1: string; line2?: string; Icon: LucideIcon; iconColor: string };

/** 강사 매칭 시 강사의 전문 분야와 대조하는 핵심 파라미터로 사용됨 */
const AUDIENCE_TARGETS: AudienceTarget[] = [
  { value: "초등(저학년)", line1: "초등",    line2: "저학년",   Icon: Bird,          iconColor: "text-yellow-500" },
  { value: "초등(고학년)", line1: "초등",    line2: "고학년",   Icon: Backpack,      iconColor: "text-orange-400" },
  { value: "중학생",       line1: "중학생",                     Icon: BookOpen,      iconColor: "text-blue-500"   },
  { value: "고등학생",     line1: "고등학생",                   Icon: Pencil,        iconColor: "text-indigo-500" },
  { value: "대학생",       line1: "대학생",                     Icon: GraduationCap, iconColor: "text-purple-500" },
  { value: "성인",         line1: "성인",                       Icon: Briefcase,     iconColor: "text-teal-600"   },
  { value: "학부모",       line1: "학부모",                     Icon: Home,          iconColor: "text-green-600"  },
  { value: "시니어(노인)", line1: "시니어",  line2: "노인",     Icon: Smile,         iconColor: "text-rose-400"   },
];

// ─── 별점 컴포넌트 ─────────────────────────────────────────────────────────────

function Stars({ value, size = "sm" }: { value: number | null; size?: "sm" | "md" }) {
  if (value === null) return <span className="text-xs text-gray-300">미평가</span>;
  const sz = size === "md" ? "w-4 h-4" : "w-3 h-3";
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} className={`${sz} ${i <= Math.round(value) ? "text-amber-400" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className={`font-bold text-amber-600 ml-0.5 ${size === "md" ? "text-sm" : "text-xs"}`}>
        {Number(value).toFixed(1)}
      </span>
    </div>
  );
}

// ─── 강의 이력 히트맵 ──────────────────────────────────────────────────────────

function ActivityHeatmap({ reports }: { reports: Report[] }) {
  const WEEKS = 52;

  const activityMap = useMemo(() => {
    const m: Record<string, number> = {};
    reports.forEach((r) => {
      const d = r.lecture_date?.slice(0, 10);
      if (d) m[d] = (m[d] ?? 0) + 1;
    });
    return m;
  }, [reports]);

  const { grid, monthLabels } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (WEEKS * 7 - 1));

    const cells: { date: string; count: number }[][] = Array.from({ length: WEEKS }, () => []);
    const labels: (string | null)[] = Array(WEEKS).fill(null);
    let prevMonth = -1;

    for (let i = 0; i < WEEKS * 7; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const wi = Math.floor(i / 7);
      cells[wi].push({ date: dateStr, count: activityMap[dateStr] ?? 0 });

      if (i % 7 === 0) {
        const mon = d.getMonth();
        if (mon !== prevMonth) {
          labels[wi] = `${mon + 1}월`;
          prevMonth = mon;
        }
      }
    }
    return { grid: cells, monthLabels: labels };
  }, [activityMap]);

  function cellColor(count: number) {
    if (count === 0) return "#eeeeee";
    if (count === 1) return "#93c5fd";
    if (count === 2) return "#3b82f6";
    return "#003087";
  }

  const DAY_LABELS = ["월", "", "수", "", "금", "", "일"];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-hwaseong-text text-sm">강의 이력 히트맵</h3>
        <span className="text-xs text-gray-400">최근 1년 · {reports.length}회 강의</span>
      </div>
      <div className="overflow-x-auto pb-1">
        <div style={{ minWidth: WEEKS * 14 + 24 }}>
          {/* 월 레이블 */}
          <div className="flex mb-1" style={{ paddingLeft: 22 }}>
            {monthLabels.map((label, wi) => (
              <div key={wi} style={{ width: 14, flexShrink: 0 }} className="text-[9px] text-gray-400">
                {label}
              </div>
            ))}
          </div>
          {/* 그리드 */}
          <div className="flex" style={{ gap: 0 }}>
            {/* 요일 레이블 */}
            <div className="flex flex-col mr-1.5" style={{ gap: 2 }}>
              {DAY_LABELS.map((l, i) => (
                <div
                  key={i}
                  className="text-[9px] text-gray-400 flex items-center"
                  style={{ height: 12, width: 18, justifyContent: "flex-end", paddingRight: 2 }}
                >
                  {l}
                </div>
              ))}
            </div>
            {/* 주 열 */}
            {grid.map((week, wi) => (
              <div key={wi} className="flex flex-col" style={{ gap: 2, marginRight: 2 }}>
                {week.map((cell, di) => (
                  <div
                    key={di}
                    title={`${cell.date}: ${cell.count > 0 ? `${cell.count}회 강의` : "강의 없음"}`}
                    style={{
                      width: 12, height: 12,
                      borderRadius: 2,
                      backgroundColor: cellColor(cell.count),
                      flexShrink: 0,
                      cursor: cell.count > 0 ? "pointer" : "default",
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* 범례 */}
      <div className="flex items-center gap-1.5 mt-2 justify-end">
        <span className="text-[10px] text-gray-400">적음</span>
        {["#eeeeee", "#93c5fd", "#3b82f6", "#003087"].map((c) => (
          <div key={c} style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: c }} />
        ))}
        <span className="text-[10px] text-gray-400">많음</span>
      </div>
    </div>
  );
}

// ─── 전문 분야 레이더 차트 ─────────────────────────────────────────────────────

function SpecialtyRadar({ matches }: { matches: MatchRequest[] }) {
  const radarData = useMemo(() => {
    const catMap: Record<string, number> = {};
    matches
      .filter((m) => m.status === "completed")
      .forEach((m) => {
        if (m.category) catMap[m.category] = (catMap[m.category] ?? 0) + 1;
      });
    if (Object.keys(catMap).length === 0) return [];
    return Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([subject, value]) => ({ subject, value }));
  }, [matches]);

  if (radarData.length < 3) {
    return (
      <div className="flex flex-col items-center justify-center h-44 text-gray-300">
        <p className="text-3xl mb-2">📡</p>
        <p className="text-sm text-center">완료된 강의가 3회 이상이면<br />레이더 차트가 표시됩니다.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={radarData} margin={{ top: 10, right: 40, bottom: 10, left: 40 }}>
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "#6b7280" }} />
        <Radar
          name="강의 횟수"
          dataKey="value"
          stroke="#003087"
          fill="#003087"
          fillOpacity={0.2}
          strokeWidth={2}
          dot={{ r: 3, fill: "#003087" }}
        />
        <Tooltip
          contentStyle={{ borderRadius: 10, fontSize: 12 }}
          formatter={(v) => [`${v}회`, "강의 수"]}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ─── 활동 증명서 모달 ──────────────────────────────────────────────────────────

type CertProps = {
  name: string;
  isVerified: boolean;
  totalLectures: number;
  totalAttendees: number;
  avgRating: string | null;
  specialties: string[];
  issuedAt: string;
  onClose: () => void;
};

function CertificateModal(p: CertProps) {
  return (
    <>
      <style>{`
        @media print {
          body > * { display: none !important; }
          #cert-print-root { display: block !important; position: fixed; inset: 0; z-index: 9999; background: white; }
        }
      `}</style>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) p.onClose(); }}
      >
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
          {/* 모달 액션 바 */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
            <div>
              <p className="font-black text-hwaseong-text text-sm">활동 증명서</p>
              <p className="text-[11px] text-gray-400">PDF로 저장하거나 인쇄할 수 있습니다.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="text-xs font-bold px-4 py-2 bg-hwaseong-blue text-white rounded-xl hover:bg-blue-900 transition-colors"
              >
                🖨️ PDF 저장
              </button>
              <button
                onClick={p.onClose}
                className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          {/* 증명서 본문 */}
          <div id="cert-print-root" className="overflow-y-auto">
            <div className="p-8">
              {/* 상단 인증 마크 */}
              <div className="text-center mb-6">
                <div className="inline-flex flex-col items-center mb-3">
                  {/* 방패형 공식 인증 마크 */}
                  <svg width="68" height="78" viewBox="0 0 68 78" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M34 2L64 13V43C64 60 34 75 34 75C34 75 4 60 4 43V13L34 2Z"
                      fill="#003087"
                    />
                    <path
                      d="M34 7L59 17V43C59 57 34 71 34 71C34 71 9 57 9 43V17L34 7Z"
                      fill="none"
                      stroke="rgba(255,255,255,0.25)"
                      strokeWidth="1.5"
                    />
                    <text x="34" y="35" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold" fontFamily="sans-serif">AI</text>
                    <text x="34" y="50" textAnchor="middle" fill="#fbbf24" fontSize="13" fontFamily="sans-serif">★★★</text>
                    <text x="34" y="62" textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="5.5" fontFamily="sans-serif" letterSpacing="0.8">HWASEONG</text>
                  </svg>
                  <p className="text-[10px] font-black text-hwaseong-blue tracking-[0.15em] mt-2 uppercase">
                    화성특례시 공식 인증
                  </p>
                </div>
                <h1 className="text-2xl font-black text-hwaseong-text tracking-tight mb-1">활동 증명서</h1>
                <p className="text-xs text-gray-400">화성 AI 시민리더 잇다(IT-DA) 플랫폼</p>
              </div>

              {/* 구분선 장식 */}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent to-hwaseong-blue/30" />
                <div className="w-2 h-2 bg-hwaseong-blue rounded-full" />
                <div className="flex-1 h-px bg-gradient-to-l from-transparent to-hwaseong-blue/30" />
              </div>

              {/* 강사 정보 */}
              <div className="bg-gray-50 rounded-2xl p-5 mb-4 space-y-3">
                {[
                  { label: "성명", value: p.name, ok: undefined as boolean | undefined },
                  { label: "인증 상태", value: p.isVerified ? "✓ 인증 완료" : "심사 대기", ok: p.isVerified },
                ].map(({ label, value, ok }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500">{label}</span>
                    <span className={`text-sm font-bold ${ok === true ? "text-green-700" : ok === false ? "text-amber-700" : "text-hwaseong-text"}`}>
                      {value}
                    </span>
                  </div>
                ))}
                {p.specialties.length > 0 && (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs font-semibold text-gray-500 pt-0.5">전문 분야</span>
                    <div className="flex flex-wrap gap-1 justify-end max-w-[65%]">
                      {p.specialties.slice(0, 6).map((s) => (
                        <span key={s} className="text-[10px] bg-hwaseong-blue/10 text-hwaseong-blue font-semibold px-2 py-0.5 rounded-full">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 활동 통계 */}
              <div className="grid grid-cols-3 gap-2 mb-5">
                {[
                  { icon: "📚", label: "총 강의", value: `${p.totalLectures}회` },
                  { icon: "👥", label: "누적 수강생", value: `${p.totalAttendees}명` },
                  { icon: "⭐", label: "평균 만족도", value: p.avgRating ? `${p.avgRating}/5` : "—" },
                ].map((s) => (
                  <div key={s.label} className="text-center bg-hwaseong-blue/5 border border-hwaseong-blue/10 rounded-2xl py-4">
                    <div className="text-2xl mb-1">{s.icon}</div>
                    <div className="font-black text-hwaseong-text text-lg leading-none">{s.value}</div>
                    <div className="text-[10px] text-gray-500 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* 인증 문구 */}
              <div className="border-t border-gray-100 pt-5 text-center space-y-3">
                <p className="text-xs text-gray-500 leading-relaxed">
                  위 사람은 화성특례시 AI 시민리더 잇다(IT-DA) 플랫폼을 통해<br />
                  시민 AI 교육 활동에 성실히 참여하였음을 증명합니다.
                </p>
                <p className="text-xs text-gray-400">발행일: {p.issuedAt}</p>

                {/* 직인 */}
                <div className="flex justify-center mt-3">
                  <div className="inline-flex flex-col items-center gap-2 border-2 border-hwaseong-blue/30 rounded-2xl px-6 py-3 bg-hwaseong-blue/5">
                    <svg width="28" height="32" viewBox="0 0 68 78" fill="none">
                      <path d="M34 2L64 13V43C64 60 34 75 34 75C34 75 4 60 4 43V13L34 2Z" fill="#003087" />
                      <text x="34" y="38" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold" fontFamily="sans-serif">AI</text>
                      <text x="34" y="55" textAnchor="middle" fill="#fbbf24" fontSize="11" fontFamily="sans-serif">★★★</text>
                    </svg>
                    <div>
                      <p className="text-[10px] text-gray-400 text-center leading-tight">화성특례시장</p>
                      <p className="text-xs font-black text-hwaseong-blue text-center">화성특례시</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────

export default function PortfolioPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [matches, setMatches] = useState<MatchRequest[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showCert, setShowCert] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== "leader")) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch("/api/match-requests").then((r) => r.json()),
      fetch("/api/activity-reports").then((r) => r.json()),
    ])
      .then(([m, r]) => {
        if (Array.isArray(m)) setMatches(m);
        if (Array.isArray(r)) setReports(r);
      })
      .finally(() => setFetching(false));
  }, [user]);

  const completedMatches = useMemo(
    () => matches.filter((m) => m.status === "completed"),
    [matches],
  );

  const reportByMatchId = useMemo(() => {
    const map: Record<string, Report> = {};
    reports.forEach((r) => { map[r.match_id] = r; });
    return map;
  }, [reports]);

  const archive = useMemo(
    () =>
      [...completedMatches]
        .sort((a, b) => b.start_date.localeCompare(a.start_date))
        .map((m) => ({ match: m, report: reportByMatchId[m.id] ?? null })),
    [completedMatches, reportByMatchId],
  );

  const bestReport = useMemo(
    () =>
      reports
        .filter((r) => r.rating_from_client !== null)
        .sort((a, b) => Number(b.rating_from_client) - Number(a.rating_from_client))[0] ?? null,
    [reports],
  );

  const totalAttendees = useMemo(
    () => reports.reduce((s, r) => s + r.attendance_count, 0),
    [reports],
  );

  // 완료 강의 교육 대상 집계 → 강점 배지 자동 생성
  const audienceStrength = useMemo(() => {
    const counts: Record<string, number> = {};
    completedMatches.forEach((m) => {
      (m.target_audience ?? []).forEach((a) => {
        counts[a] = (counts[a] ?? 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1]);
  }, [completedMatches]);

  const { avgRating, ratedCount } = useMemo(() => {
    const rated = reports.filter((r) => r.rating_from_client !== null);
    const avg = rated.length
      ? (rated.reduce((s, r) => s + Number(r.rating_from_client), 0) / rated.length).toFixed(1)
      : null;
    return { avgRating: avg, ratedCount: rated.length };
  }, [reports]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-hwaseong-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const lp = user.leaderProfile;

  return (
    <>
      <Head><title>포트폴리오 | 화성 AI 시민리더 잇다</title></Head>
      <DashboardLayout pageTitle="포트폴리오">

        {/* 프로필 히어로 */}
        <div className="bg-gradient-to-br from-hwaseong-blue via-[#003fa3] to-indigo-700 rounded-3xl overflow-hidden">
          <div className="p-6">
            <button
              onClick={() => router.push("/dashboard/leader")}
              className="flex items-center gap-1.5 text-white/60 text-xs mb-4 hover:text-white transition-colors"
            >
              ← 대시보드
            </button>
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-white/20 border-2 border-white/30 rounded-2xl flex items-center justify-center text-3xl font-black text-white flex-shrink-0">
                {user.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h2 className="text-xl font-black text-white">{user.name}</h2>
                  {lp?.isVerified && (
                    <span className="text-[10px] font-bold bg-green-400/20 text-green-200 border border-green-400/40 px-2 py-0.5 rounded-full">
                      ✓ 공식 인증
                    </span>
                  )}
                </div>
                {lp?.specialties && lp.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {lp.specialties.slice(0, 4).map((s) => (
                      <span key={s} className="text-[10px] bg-white/10 text-blue-100 border border-white/20 px-2 py-0.5 rounded-full">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowCert(true)}
                className="flex-shrink-0 text-xs font-bold px-4 py-2.5 bg-white/10 border border-white/30 text-white rounded-xl hover:bg-white/20 transition-colors"
              >
                📋 증명서 발급
              </button>
            </div>
          </div>

          {/* 통계 바 */}
          <div className="bg-black/20 border-t border-white/10 grid grid-cols-3 divide-x divide-white/10">
            {[
              { label: "총 강의", value: `${completedMatches.length}회` },
              { label: "누적 수강생", value: `${totalAttendees}명` },
              { label: "평균 만족도", value: avgRating ? `⭐ ${avgRating}` : "—" },
            ].map((s) => (
              <div key={s.label} className="py-3 text-center">
                <p className="text-white font-bold text-base leading-tight">{s.value}</p>
                <p className="text-blue-300 text-[10px] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 강점 대상 배지 (자동 생성) ── */}
        {(audienceStrength.length > 0 || !fetching) && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-hwaseong-text text-sm">강점 대상 배지</h3>
              <span className="text-[11px] text-gray-400">완료 강의 기준 · 자동 생성</span>
            </div>

            {audienceStrength.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center text-gray-300">
                <p className="text-3xl mb-2">🏅</p>
                <p className="text-xs">교육 대상이 기록된 완료 강의가 쌓이면<br />강점 배지가 자동으로 생성됩니다.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {audienceStrength.map(([audience, count]) => {
                  const opt = AUDIENCE_TARGETS.find((o) => o.value === audience);
                  const tier =
                    count >= 10 ? { label: "마스터",   badge: "🏆", color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200",  bar: "bg-amber-400" }
                  : count >= 5  ? { label: "전문 대상", badge: "🌟", color: "text-green-700",  bg: "bg-green-50",  border: "border-green-200",  bar: "bg-green-500" }
                  : count >= 3  ? { label: "강점 대상", badge: "⚡", color: "text-hwaseong-blue", bg: "bg-hwaseong-blue/5", border: "border-hwaseong-blue/20", bar: "bg-hwaseong-blue" }
                  :               { label: "경험 보유", badge: "📌", color: "text-gray-500",   bg: "bg-gray-50",   border: "border-gray-200",   bar: "bg-gray-300" };

                  return (
                    <div key={audience} className={`rounded-xl border p-3 ${tier.bg} ${tier.border}`}>
                      <div className="flex items-center gap-2 mb-2">
                        {opt
                          ? <opt.Icon size={18} className={opt.iconColor} strokeWidth={1.8} />
                          : <span className="text-base">🎓</span>
                        }
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-gray-700 truncate">{audience}</p>
                          <span className={`text-[10px] font-bold ${tier.color}`}>
                            {tier.badge} {tier.label}
                          </span>
                        </div>
                        <span className={`text-sm font-black ${tier.color}`}>{count}회</span>
                      </div>
                      {/* 경험 바 (최대 10회 기준) */}
                      <div className="h-1.5 bg-black/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${tier.bar}`}
                          style={{ width: `${Math.min(count / 10 * 100, 100).toFixed(0)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── 시각화 ── */}
        <div className="space-y-4">
          {/* 히트맵 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <ActivityHeatmap reports={reports} />
          </div>

          {/* 레이더 차트 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-hwaseong-text text-sm">전문 분야 레이더 차트</h3>
              <span className="text-xs text-gray-400">완료 강의 카테고리 기준</span>
            </div>
            {fetching ? (
              <div className="h-44 flex items-center justify-center">
                <div className="w-6 h-6 border-4 border-hwaseong-blue border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <SpecialtyRadar matches={matches} />
            )}
          </div>
        </div>

        {/* ── 이력 아카이브 ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-hwaseong-text text-sm">강의 이력 아카이브</h3>
            <span className="text-xs text-gray-400">{archive.length}건 완료 · 평가 {ratedCount}건</span>
          </div>

          {/* 베스트 리뷰 */}
          {bestReport && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">🏆</span>
                <span className="text-xs font-black text-amber-800">베스트 리뷰 강의</span>
                <div className="ml-auto">
                  <Stars value={bestReport.rating_from_client} size="md" />
                </div>
              </div>
              <p className="text-sm font-bold text-amber-900 mb-1 line-clamp-1">
                {bestReport.match?.title ?? "—"}
              </p>
              {bestReport.report_text && (
                <p className="text-xs text-amber-700 leading-relaxed line-clamp-3 bg-white/50 rounded-xl px-3 py-2 mt-2">
                  {bestReport.report_text}
                </p>
              )}
            </div>
          )}

          {/* 아카이브 목록 */}
          {fetching ? (
            <div className="flex justify-center py-12">
              <div className="w-7 h-7 border-4 border-hwaseong-blue border-t-transparent rounded-full animate-spin" />
            </div>
          ) : archive.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 text-gray-400">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-sm">완료된 강의가 없습니다.</p>
              <p className="text-xs text-gray-300 mt-1">강의를 완료하면 이력이 쌓입니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {archive.map(({ match: m, report: r }, idx) => (
                <div key={m.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* 순위 + 상태 헤더 */}
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                    <span className="text-[11px] font-black text-gray-400 w-6 text-center">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                      ✅ 완료
                    </span>
                    {r?.admin_approved_at ? (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                        ✓ 승인
                      </span>
                    ) : r ? (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        ⏳ 승인 대기
                      </span>
                    ) : null}
                    <div className="ml-auto">
                      {r ? (
                        <Stars value={r.rating_from_client} />
                      ) : (
                        <span className="text-[10px] text-red-400 font-semibold">보고서 없음</span>
                      )}
                    </div>
                  </div>

                  {/* 강의 정보 */}
                  <div className="p-4">
                    <p className="font-bold text-hwaseong-text text-sm leading-snug mb-1.5">{m.title}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-400 mb-3">
                      <span>📅 {m.start_date}</span>
                      {m.address && <span>📍 {m.address}</span>}
                      <span>🏢 {m.client?.name}</span>
                      <span>🎯 {m.category}</span>
                    </div>

                    {r && (
                      <div className="flex flex-wrap gap-2">
                        <span className="text-[11px] bg-gray-50 text-gray-500 px-2.5 py-1 rounded-lg">
                          👥 {r.attendance_count}명 수강
                        </span>
                        {r.image_urls?.length > 0 && (
                          <span className="text-[11px] bg-gray-50 text-gray-500 px-2.5 py-1 rounded-lg">
                            📷 현장사진 {r.image_urls.length}장
                          </span>
                        )}
                        <span className="text-[11px] bg-gray-50 text-gray-500 px-2.5 py-1 rounded-lg">
                          📤 {new Date(r.submitted_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })} 제출
                        </span>
                      </div>
                    )}

                    {r?.report_text && (
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mt-2 border-t border-gray-50 pt-2">
                        {r.report_text}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </DashboardLayout>

      {showCert && (
        <CertificateModal
          name={user.name}
          isVerified={lp?.isVerified ?? false}
          totalLectures={completedMatches.length}
          totalAttendees={totalAttendees}
          avgRating={avgRating}
          specialties={lp?.specialties ?? []}
          issuedAt={new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
          onClose={() => setShowCert(false)}
        />
      )}
    </>
  );
}
