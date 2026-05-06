import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import DashboardLayout from "@/components/DashboardLayout";
import { MOCK_ACTIVITY_LOGS, MONTHLY_STATS, CATEGORY_STATS } from "@/lib/mock-data";

/* ─── 상수 ─────────────────────────────────────────────── */
const PIE_COLORS = ["#003087", "#0066CC", "#2E7D32", "#F59E0B"];

const UPCOMING = [
  { date: "2026-05-24", title: "생성형 AI 기초 실습",   org: "화성시 도서관",  size: 25, location: "AI 혁신센터 본원", status: "confirmed" },
  { date: "2026-06-07", title: "어린이 AI 교육",         org: "동탄초등학교",   size: 30, location: "학교 컴퓨터실",    status: "confirmed" },
  { date: "2026-06-14", title: "시니어 스마트폰 AI",     org: "노인복지관",     size: 20, location: "복지관 강당",      status: "pending"   },
];

const REVIEWS = [
  {
    name: "화성시 도서관 수강생",
    date: "2026.05.03",
    rating: 5,
    text: "정말 이해하기 쉽게 설명해 주셨어요! AI가 이렇게 쉬운 건지 몰랐습니다. 다음 강의도 기대됩니다.",
  },
  {
    name: "동탄초등학교 교사",
    date: "2026.04.20",
    rating: 5,
    text: "어린이 눈높이에 딱 맞는 설명이 인상적이었어요. 학생들 반응이 정말 뜨거웠습니다.",
  },
  {
    name: "(주)화성테크 직원",
    date: "2026.05.17",
    rating: 5,
    text: "실습 위주 진행 덕분에 바로 업무에 적용할 수 있었습니다. 강추합니다!",
  },
  {
    name: "노인복지관 이용자",
    date: "2026.04.02",
    rating: 4.5,
    text: "천천히 반복해서 설명해 주셔서 따라하기 편했어요. 정말 친절하신 강사님이에요.",
  },
];

const ACHIEVEMENTS = [
  { id: "first",   icon: "🎯", title: "첫 강의 완료",    sub: "2026.03.15",           unlocked: true  },
  { id: "100pax",  icon: "👥", title: "수강생 100명 돌파", sub: "2026.05.03",           unlocked: true  },
  { id: "rating",  icon: "⭐", title: "평점 4.8+",        sub: "현재 유지 중",          unlocked: true  },
  { id: "corp",    icon: "🏢", title: "기업 교육 완수",   sub: "2026.05.17",           unlocked: true  },
  { id: "5region", icon: "📍", title: "5개 지역 활동",    sub: "4 / 5 지역 달성 중",   unlocked: false },
  { id: "mentor",  icon: "🏆", title: "AI 리더 멘토",     sub: "수강생 200명 달성 시", unlocked: false },
];

const MONTHLY_GOAL = { target: 3, achieved: 2, month: "5월" };

/* ─── 별점 컴포넌트 ─────────────────────────────────────── */
function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-amber-400 text-sm">
      {"★".repeat(Math.floor(rating))}
      {rating % 1 >= 0.5 ? "½" : ""}
      <span className="text-gray-200">{"★".repeat(5 - Math.ceil(rating))}</span>
    </span>
  );
}

/* ─── 메인 ──────────────────────────────────────────────── */
export default function InstructorDashboard() {
  const [activeTab, setActiveTab] = useState<"bar" | "line">("bar");

  const totalAudience = MOCK_ACTIVITY_LOGS.reduce((s, a) => s + a.audience_count, 0);
  const avgRating     = (MOCK_ACTIVITY_LOGS.reduce((s, a) => s + a.rating, 0) / MOCK_ACTIVITY_LOGS.length).toFixed(1);
  const goalPct       = Math.round((MONTHLY_GOAL.achieved / MONTHLY_GOAL.target) * 100);

  return (
    <>
      <Head>
        <title>강사 대시보드 | 화성 AI 리더 허브</title>
      </Head>

      <DashboardLayout role="instructor" userName="박준호" pageTitle="강사 대시보드">

        {/* ══ 프로필 히어로 배너 ══════════════════════════════ */}
        <div id="profile" className="bg-gradient-to-br from-hwaseong-blue via-[#003fa3] to-indigo-700 rounded-3xl overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 bg-white/20 border-2 border-white/40 rounded-2xl flex items-center justify-center text-4xl font-black text-white">
                  박
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 rounded-full border-2 border-white flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-black text-white">박준호</h2>
                <p className="text-blue-200 text-sm mb-3">AI 시민 리더 강사 · 화성특례시 공식 인증</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "🏅 AI 시민 리더",  style: "bg-amber-400/20 text-amber-200 border border-amber-400/30" },
                    { label: "🎓 KAIST 이수증",   style: "bg-white/10 text-blue-100 border border-white/20" },
                    { label: "✅ 역량 평가 통과",  style: "bg-green-400/20 text-green-200 border border-green-400/30" },
                    { label: "📍 동탄·봉담·향남", style: "bg-white/10 text-blue-100 border border-white/20" },
                  ].map((t) => (
                    <span key={t.label} className={`text-xs font-medium px-2.5 py-1 rounded-full ${t.style}`}>
                      {t.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 flex-shrink-0 sm:flex-col">
                <button className="text-xs bg-white text-hwaseong-blue font-bold px-4 py-2 rounded-xl hover:bg-blue-50 transition-colors shadow-md">
                  포트폴리오 공개
                </button>
                <button className="text-xs bg-white/10 border border-white/30 text-white font-medium px-4 py-2 rounded-xl hover:bg-white/20 transition-colors">
                  프로필 수정
                </button>
              </div>
            </div>
          </div>

          {/* Stat bar */}
          <div className="bg-black/20 border-t border-white/10 grid grid-cols-4 divide-x divide-white/10">
            {[
              { label: "총 강의",    value: `${MOCK_ACTIVITY_LOGS.length}회` },
              { label: "누적 수강생", value: `${totalAudience}명` },
              { label: "평균 평점",  value: `⭐ ${avgRating}` },
              { label: "다음 강의",  value: "3일 후" },
            ].map((s) => (
              <div key={s.label} className="py-3 text-center">
                <p className="text-white font-bold text-lg leading-tight">{s.value}</p>
                <p className="text-blue-300 text-xs">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ══ 스마트 매칭 바로가기 배너 ═══════════════════════ */}
        <Link href="/dashboard/matching">
          <div className="bg-gradient-to-r from-green-600 to-emerald-500 rounded-2xl p-5 flex items-center gap-4 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all">
            <div className="text-4xl">🗺️</div>
            <div className="flex-1">
              <p className="text-white font-bold text-base">스마트 매칭 대시보드</p>
              <p className="text-green-100 text-xs mt-0.5">새 강의 요청 2건 · 위치 지도 · 현장 보고서 제출</p>
            </div>
            <div className="bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0">
              바로가기 →
            </div>
          </div>
        </Link>

        {/* ══ KPI 카드 (트렌드 포함) ══════════════════════════ */}
        <div id="kpi" className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "총 강의 횟수",  value: MOCK_ACTIVITY_LOGS.length, unit: "회", icon: "📚", color: "bg-hwaseong-blue", trend: "+2",  up: true  },
            { label: "누적 수강생",   value: totalAudience,              unit: "명", icon: "👥", color: "bg-green-600",     trend: "+35", up: true  },
            { label: "평균 만족도",   value: avgRating,                  unit: "점", icon: "🌟", color: "bg-amber-500",     trend: "+0.1",up: true  },
            { label: "이달 강의",     value: MONTHLY_GOAL.achieved,      unit: "회", icon: "📅", color: "bg-sky-500",       trend: `목표 ${MONTHLY_GOAL.target}회`, up: null },
          ].map((c) => (
            <div key={c.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-9 h-9 ${c.color} rounded-xl flex items-center justify-center text-base flex-shrink-0`}>
                  {c.icon}
                </div>
                {c.up !== null && (
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-lg flex items-center gap-0.5 ${
                    c.up ? "text-green-600 bg-green-50" : "text-red-500 bg-red-50"
                  }`}>
                    {c.up ? "▲" : "▼"} {c.trend}
                  </span>
                )}
                {c.up === null && (
                  <span className="text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-lg">{c.trend}</span>
                )}
              </div>
              <p className="text-2xl font-black text-hwaseong-text">{c.value}<span className="text-sm font-normal text-gray-400 ml-0.5">{c.unit}</span></p>
              <p className="text-xs text-gray-400 mt-0.5">{c.label}</p>
            </div>
          ))}
        </div>

        {/* ══ 이달 강의 목표 ══════════════════════════════════ */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-hwaseong-text">{MONTHLY_GOAL.month} 강의 목표</h3>
              <p className="text-xs text-gray-400 mt-0.5">목표 {MONTHLY_GOAL.target}회 중 {MONTHLY_GOAL.achieved}회 완료</p>
            </div>
            <span className={`text-sm font-black px-3 py-1 rounded-xl ${
              goalPct >= 100 ? "bg-green-100 text-green-600" : "bg-hwaseong-light text-hwaseong-blue"
            }`}>
              {goalPct}%
            </span>
          </div>

          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-hwaseong-blue to-hwaseong-skyblue transition-all duration-700 relative overflow-hidden"
                style={{ width: `${Math.min(goalPct, 100)}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            {Array.from({ length: MONTHLY_GOAL.target }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-1.5 rounded-full ${
                  i < MONTHLY_GOAL.achieved ? "bg-hwaseong-blue" : "bg-gray-100"
                }`}
              />
            ))}
          </div>

          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span>0회</span>
            <span className="text-hwaseong-blue font-semibold">현재 {MONTHLY_GOAL.achieved}회</span>
            <span>목표 {MONTHLY_GOAL.target}회</span>
          </div>
        </div>

        {/* ══ 차트 ═══════════════════════════════════════════ */}
        <div id="chart" className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* 탭 전환 차트 */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-hwaseong-text">
                  {activeTab === "bar" ? "월별 강의 & 수강생 추이" : "나의 수강생 성장 곡선"}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">2026년 상반기 데이터</p>
              </div>
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                {(["bar", "line"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${
                      activeTab === t ? "bg-white text-hwaseong-blue shadow-sm" : "text-gray-500"
                    }`}
                  >
                    {t === "bar" ? "막대 그래프" : "성장 곡선"}
                  </button>
                ))}
              </div>
            </div>

            <ResponsiveContainer width="100%" height={220}>
              {activeTab === "bar" ? (
                <BarChart data={MONTHLY_STATS} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left"  tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="left"  dataKey="sessions" name="강의 횟수" fill="#003087" radius={[4,4,0,0]} />
                  <Bar yAxisId="right" dataKey="learners" name="수강생 수" fill="#0066CC" radius={[4,4,0,0]} />
                </BarChart>
              ) : (
                <LineChart data={MONTHLY_STATS} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Line type="monotone" dataKey="learners" stroke="#003087" strokeWidth={2.5} dot={{ r: 4, fill: "#003087" }} name="수강생 수" />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* 파이 차트 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-bold text-hwaseong-text mb-1">강의 카테고리</h3>
            <p className="text-xs text-gray-400 mb-3">누적 강의 분포 (%)</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={CATEGORY_STATS} cx="50%" cy="50%" innerRadius={48} outerRadius={76} dataKey="value" paddingAngle={3}>
                  {CATEGORY_STATS.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-3 space-y-1.5">
              {CATEGORY_STATS.map((c, i) => (
                <div key={c.name} className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i] }} />
                  <span className="text-gray-600 flex-1">{c.name}</span>
                  <span className="font-semibold text-gray-700">{c.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══ 다가오는 강의 일정 ════════════════════════════ */}
        <section id="schedule" className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-hwaseong-text">다가오는 강의 일정</h3>
              <p className="text-xs text-gray-400 mt-0.5">확정 및 대기 중인 강의</p>
            </div>
            <button className="text-xs text-hwaseong-skyblue font-medium hover:underline">전체 일정 보기</button>
          </div>
          <div className="space-y-3">
            {UPCOMING.map((s, i) => (
              <div
                key={i}
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all hover:shadow-sm ${
                  s.status === "confirmed" ? "border-blue-100 bg-blue-50/50" : "border-amber-100 bg-amber-50/50"
                }`}
              >
                {/* Date box */}
                <div className={`flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center font-bold ${
                  s.status === "confirmed" ? "bg-hwaseong-blue text-white" : "bg-amber-500 text-white"
                }`}>
                  <span className="text-[10px] font-medium opacity-80">{s.date.slice(5, 7)}월</span>
                  <span className="text-xl leading-tight">{s.date.slice(8)}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-hwaseong-text text-sm truncate">{s.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.org} · {s.location}</p>
                </div>

                {/* Right */}
                <div className="flex-shrink-0 text-right">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full block mb-1 ${
                    s.status === "confirmed" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {s.status === "confirmed" ? "확정" : "대기"}
                  </span>
                  <span className="text-xs text-gray-400">{s.size}명</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ══ 수강생 리뷰 ═════════════════════════════════ */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-hwaseong-text">수강생 리뷰</h3>
              <p className="text-xs text-gray-400 mt-0.5">최근 수강생 만족도 평가</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-hwaseong-text">{avgRating}</p>
              <Stars rating={Number(avgRating)} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {REVIEWS.map((r, i) => (
              <div key={i} className="bg-hwaseong-gray rounded-2xl p-4 border border-gray-100">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-xs font-semibold text-hwaseong-text truncate">{r.name}</p>
                  <span className="text-xs text-gray-400 flex-shrink-0">{r.date}</span>
                </div>
                <Stars rating={r.rating} />
                <p className="text-xs text-gray-600 leading-relaxed mt-2 line-clamp-2">&ldquo;{r.text}&rdquo;</p>
              </div>
            ))}
          </div>
        </section>

        {/* ══ 성취 배지 ═══════════════════════════════════ */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-hwaseong-text">성취 배지</h3>
              <p className="text-xs text-gray-400 mt-0.5">강의 활동을 통해 획득하는 마일스톤</p>
            </div>
            <span className="text-xs font-semibold bg-hwaseong-light text-hwaseong-blue px-3 py-1 rounded-full">
              {ACHIEVEMENTS.filter((a) => a.unlocked).length} / {ACHIEVEMENTS.length} 획득
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ACHIEVEMENTS.map((a) => (
              <div
                key={a.id}
                className={`relative rounded-2xl p-4 border-2 flex flex-col items-center text-center transition-all ${
                  a.unlocked
                    ? "border-hwaseong-light bg-hwaseong-light hover:shadow-md hover:-translate-y-0.5"
                    : "border-dashed border-gray-200 bg-gray-50 opacity-60"
                }`}
              >
                <span className={`text-3xl mb-2 ${a.unlocked ? "" : "grayscale"}`}>{a.icon}</span>
                <p className={`text-xs font-bold leading-snug ${a.unlocked ? "text-hwaseong-text" : "text-gray-400"}`}>
                  {a.title}
                </p>
                <p className={`text-[10px] mt-1 ${a.unlocked ? "text-hwaseong-blue" : "text-gray-400"}`}>
                  {a.sub}
                </p>
                {a.unlocked && (
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ══ 활동 기록 테이블 ════════════════════════════ */}
        <section id="log" className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-hwaseong-text">최근 강의 활동 기록</h3>
              <p className="text-xs text-gray-400 mt-0.5">2026년 전체 강의 이력</p>
            </div>
            <button className="text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
              엑셀 내보내기
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 rounded-xl">
                  {["날짜", "과정명", "장소", "수강생", "만족도"].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 px-3 py-2.5 first:rounded-l-xl last:rounded-r-xl">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MOCK_ACTIVITY_LOGS.map((log) => (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-3 text-gray-500 text-xs whitespace-nowrap">{log.date}</td>
                    <td className="py-3 px-3 font-medium text-hwaseong-text">{log.title}</td>
                    <td className="py-3 px-3 text-gray-500 text-xs">{log.location}</td>
                    <td className="py-3 px-3">
                      <span className="text-xs font-bold text-hwaseong-text bg-blue-50 px-2 py-0.5 rounded-full">
                        {log.audience_count}명
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <Stars rating={log.rating} />
                        <span className="text-xs font-bold text-gray-700">{log.rating}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </DashboardLayout>
    </>
  );
}
