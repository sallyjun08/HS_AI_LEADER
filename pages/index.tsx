import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import GNB from "@/components/GNB";
import LiveCountBanner from "@/components/LiveCountBanner";
import Footer from "@/components/Footer";
import type { UserRole } from "@/types/database";

/* ─── Hero slides ─────────────────────────────── */
const HERO_SLIDES = [
  {
    bg: "from-[#001845] via-[#003087] to-[#00419e]",
    badge: "2026 AI 혁신학교 AI랩 운영 중",
    head1: "배우고, 가르치고,",
    head2: "지역을 바꾸다",
    desc: "구글 폼을 대체하는 통합 신청·관리 플랫폼. 시민 리더의 성장 로드맵과 활동 임팩트를 데이터로 시각화합니다.",
  },
  {
    bg: "from-[#001133] via-[#002766] to-[#004aad]",
    badge: "AI 시민 리더 47명 현재 활동 중",
    head1: "AI 시민 리더,",
    head2: "화성을 바꾼다",
    desc: "일반 시민이 AI를 배우고, 이웃에게 가르치고, 지역 사회를 혁신하는 선순환 생태계를 만들어 갑니다.",
  },
  {
    bg: "from-[#0d1b42] via-[#1a3270] to-[#2660a8]",
    badge: "누적 교육 횟수 156회 달성",
    head1: "강사와 수요처,",
    head2: "스마트하게 연결",
    desc: "운영자가 적합한 강사를 필터링·매칭하여 학교·기관·기업에 최적의 AI 교육을 제공합니다.",
  },
];

/* ─── Roles ───────────────────────────────────── */
const ROLES: {
  role: UserRole;
  icon: string;
  title: string;
  sub: string;
  features: string[];
  href: string;
  color: string;
  border: string;
  btn: string;
}[] = [
  {
    role: "learner",
    icon: "🎓",
    title: "피교육자 (시민·기관)",
    sub: "AI를 배우고 싶은 시민, 교육을 원하는 기관",
    features: ["교육 로드맵 시각화", "원클릭 수업 신청", "강사 파견 요청", "이수 현황 관리"],
    href: "/dashboard/learner",
    color: "from-sky-500 to-blue-600",
    border: "border-sky-200 hover:border-sky-400",
    btn: "bg-sky-600 hover:bg-sky-700",
  },
  {
    role: "instructor",
    icon: "🏅",
    title: "강사 (AI 시민 리더)",
    sub: "AI 시민 리더 자격을 취득한 강사",
    features: ["포트폴리오 관리", "강의 스케줄 확인", "임팩트 대시보드", "활동 실적 시각화"],
    href: "/dashboard/instructor",
    color: "from-hwaseong-blue to-indigo-700",
    border: "border-blue-200 hover:border-blue-500",
    btn: "bg-hwaseong-blue hover:bg-blue-900",
  },
  {
    role: "operator",
    icon: "⚙️",
    title: "운영자 (화성시)",
    sub: "매칭·배정·통계를 관제하는 화성시 담당자",
    features: ["강사-수요처 매칭 관제", "교육 장소 배정", "전체 통계 분석", "엑셀 데이터 마이그레이션"],
    href: "/dashboard/operator",
    color: "from-green-600 to-teal-700",
    border: "border-green-200 hover:border-green-500",
    btn: "bg-green-700 hover:bg-green-800",
  },
];

/* ─── News board ──────────────────────────────── */
type NewsTab = "all" | "notice" | "edu" | "press" | "recruit";

const NEWS_TABS: { key: NewsTab; label: string; color: string }[] = [
  { key: "all",     label: "전체",     color: "#003087" },
  { key: "notice",  label: "공지사항", color: "#147b6a" },
  { key: "edu",     label: "교육소식", color: "#004d97" },
  { key: "press",   label: "보도자료", color: "#617B2D" },
  { key: "recruit", label: "채용공고", color: "#4E841F" },
];

const NEWS_ITEMS: { cat: NewsTab; catLabel: string; catColor: string; title: string; date: string; isNew: boolean }[] = [
  { cat: "notice",  catLabel: "공지사항", catColor: "#147b6a", title: "2026년 하반기 AI 시민 리더 2기 모집 공고",          date: "2026.05.01", isNew: true  },
  { cat: "edu",     catLabel: "교육소식", catColor: "#004d97", title: "5월 생성형 AI 기초 과정 수강생 모집 시작",           date: "2026.04.28", isNew: true  },
  { cat: "press",   catLabel: "보도자료", catColor: "#617B2D", title: "화성시 AI 시민 리더 1기 수료식 성황리 개최",         date: "2026.04.25", isNew: false },
  { cat: "notice",  catLabel: "공지사항", catColor: "#147b6a", title: "AI 혁신센터 5월 운영 일정 안내",                     date: "2026.04.20", isNew: false },
  { cat: "recruit", catLabel: "채용공고", catColor: "#4E841F", title: "AI랩 운영 보조 인력 채용 공고",                      date: "2026.04.15", isNew: false },
  { cat: "edu",     catLabel: "교육소식", catColor: "#004d97", title: "강사 파견 서비스 동탄·봉담 지역 확대 운영 안내",     date: "2026.04.10", isNew: false },
];

const TICKERS = [
  "공지 | 2026년 하반기 AI 시민 리더 2기 모집이 시작됩니다.",
  "교육 | 5월 AI 기초 과정 수강생을 모집합니다. 선착순 40명.",
  "소식 | AI 혁신센터 강사 파견 서비스 동탄·봉담 확대 운영.",
  "공지 | 2026 화성시 AI랩 우수 수강생 장학금 신청 안내.",
];

/* ─── Service flow ────────────────────────────── */
const SERVICE_FLOW = [
  { step: "01", icon: "👤", title: "가입·인증",    desc: "역할 선택 후 가입. 강사는 교육 수료 데이터로 자동 인증" },
  { step: "02", icon: "📋", title: "수요 발생",    desc: "피교육자(기관)가 강의 테마·일정·규모를 플랫폼에 요청" },
  { step: "03", icon: "🔗", title: "운영자 매칭",  desc: "운영자가 적합한 강사를 필터링하여 매칭 및 장소 배정" },
  { step: "04", icon: "📊", title: "활동 기록",    desc: "강의 완료 후 강사·운영자 대시보드에 실시간 데이터 반영" },
];

/* ══════════════════════════════════════════════ */
export default function Landing() {
  const [slide, setSlide]     = useState(0);
  const [newsTab, setNewsTab] = useState<NewsTab>("all");

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % HERO_SLIDES.length), 4500);
    return () => clearInterval(t);
  }, []);

  const filteredNews =
    newsTab === "all" ? NEWS_ITEMS : NEWS_ITEMS.filter((n) => n.cat === newsTab);

  return (
    <>
      <Head>
        <title>화성 AI 리더 허브 — 화성특례시 AI 시민 리더 양성 플랫폼</title>
        <meta name="description" content="화성시 AI 혁신학교 AI랩 — 시민 리더 양성 통합 플랫폼" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* GNB는 fixed — 레이아웃 흐름에서 제거됨 */}
      <GNB />

      {/* ══ HERO ══════════════════════════════════ */}
      <section className="relative min-h-screen overflow-hidden">
        {/* Slide backgrounds */}
        {HERO_SLIDES.map((s, i) => (
          <div
            key={i}
            className={`absolute inset-0 bg-gradient-to-br ${s.bg} transition-opacity duration-1000 ${
              i === slide ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}

        {/* Decorative circles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-white/5" />
          <div className="absolute bottom-0 -left-20 w-80 h-80 rounded-full bg-blue-400/10" />
          <div className="absolute top-1/2 right-1/4 w-64 h-64 rounded-full border border-white/10" />
        </div>

        {/* Content — top padding clears the fixed GNB (~100px) */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-36 pb-32 min-h-screen flex flex-col justify-center">
          <div className="max-w-3xl">
            {/* Badge */}
            <span className="inline-flex items-center gap-2 bg-white/15 border border-white/25 text-xs font-semibold px-4 py-1.5 rounded-full mb-7 backdrop-blur-sm text-white">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              {HERO_SLIDES[slide].badge}
            </span>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-tight tracking-tight mb-6 transition-all duration-700">
              {HERO_SLIDES[slide].head1}
              <br />
              <span className="text-yellow-300">{HERO_SLIDES[slide].head2}</span>
            </h1>

            {/* Sub-text */}
            <p className="text-blue-100 text-base sm:text-lg leading-relaxed max-w-xl mb-10 transition-all duration-700">
              {HERO_SLIDES[slide].desc}
            </p>

            {/* CTA */}
            <div className="flex flex-wrap gap-3">
              <a href="#roles">
                <button className="px-8 py-3.5 bg-white text-hwaseong-blue font-bold text-sm rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
                  역할 선택하고 시작하기 →
                </button>
              </a>
              <a href="#stats">
                <button className="px-8 py-3.5 bg-white/15 border border-white/40 text-white font-semibold text-sm rounded-xl hover:bg-white/25 backdrop-blur-sm transition-colors">
                  실시간 현황 보기
                </button>
              </a>
            </div>
          </div>
        </div>

        {/* Slide dots */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              aria-label={`슬라이드 ${i + 1}`}
              className={`transition-all duration-300 rounded-full border-2 border-white/60 ${
                i === slide
                  ? "w-7 h-[10px] bg-white"
                  : "w-[10px] h-[10px] bg-transparent"
              }`}
            />
          ))}
        </div>

        {/* Slide counter */}
        <div className="absolute bottom-10 right-6 sm:right-12 text-white/50 text-sm tabular-nums z-10 hidden sm:block">
          {String(slide + 1).padStart(2, "0")} / {String(HERO_SLIDES.length).padStart(2, "0")}
        </div>
      </section>

      {/* ══ NEWS TICKER ══════════════════════════ */}
      <div className="bg-hwaseong-blue text-white py-2.5 overflow-hidden">
        <div className="flex gap-0 w-max animate-ticker">
          {[...TICKERS, ...TICKERS].map((t, i) => (
            <span key={i} className="flex items-center gap-3 px-10 text-sm whitespace-nowrap">
              <span className="bg-yellow-400 text-hwaseong-blue font-bold text-xs px-2 py-0.5 rounded-full">
                NEW
              </span>
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* ══ 주요 사업 (역할 카드) ═══════════════ */}
      <section id="programs" className="bg-[#eef3f9] py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-14">
            <p className="text-hwaseong-skyblue text-sm font-semibold tracking-widest uppercase mb-3">
              Main Service
            </p>
            <h2 className="text-4xl sm:text-5xl font-bold text-hwaseong-text tracking-tight leading-tight">
              역할에 최적화된
              <br />
              <span className="text-hwaseong-blue">맞춤형 대시보드</span>
            </h2>
            <div className="w-12 h-1 bg-hwaseong-blue rounded-full mt-6" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="roles">
            {ROLES.map((r) => (
              <div
                key={r.role}
                className={`bg-white rounded-2xl border-2 ${r.border} shadow-sm flex flex-col transition-all hover:shadow-xl hover:-translate-y-1`}
              >
                {/* Card header */}
                <div className={`bg-gradient-to-br ${r.color} rounded-t-2xl p-8 text-white text-center`}>
                  <span className="text-5xl block mb-4">{r.icon}</span>
                  <h3 className="font-bold text-xl leading-snug">{r.title}</h3>
                  <p className="text-xs text-white/80 mt-2">{r.sub}</p>
                </div>

                <div className="p-6 flex-1 flex flex-col">
                  <ul className="space-y-2.5 mb-7 flex-1">
                    {r.features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-sm text-gray-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-hwaseong-skyblue flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href={r.href}>
                    <button
                      className={`w-full ${r.btn} text-white py-3.5 rounded-xl font-semibold text-sm transition-colors shadow-sm`}
                    >
                      {r.title.split(" ")[0]} 대시보드 입장 →
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ LIVE COUNT ═══════════════════════════ */}
      <LiveCountBanner />

      {/* ══ 알림마당 (뉴스 보드) ════════════════ */}
      <section id="notice" className="bg-white py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
            <div>
              <p className="text-hwaseong-skyblue text-sm font-semibold tracking-widest uppercase mb-3">
                News &amp; Notice
              </p>
              <h2 className="text-4xl sm:text-5xl font-bold text-hwaseong-text tracking-tight">
                알림마당
              </h2>
              <div className="w-12 h-1 bg-hwaseong-blue rounded-full mt-6" />
            </div>
            <a href="#notice" className="text-sm text-hwaseong-skyblue hover:underline font-medium flex-shrink-0">
              전체 보기 →
            </a>
          </div>

          {/* Tab bar */}
          <div className="flex flex-wrap gap-2 mb-6">
            {NEWS_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setNewsTab(t.key)}
                className={`px-4 py-2 text-sm font-semibold rounded-full border-2 transition-all ${
                  newsTab === t.key
                    ? "text-white border-transparent"
                    : "text-gray-600 border-gray-200 hover:border-gray-300"
                }`}
                style={newsTab === t.key ? { backgroundColor: t.color, borderColor: t.color } : {}}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* News list */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
            {filteredNews.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-4 px-6 py-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer group transition-colors"
              >
                <span
                  className="flex-shrink-0 text-xs font-bold text-white px-3 py-1 rounded-full min-w-[68px] text-center"
                  style={{ backgroundColor: item.catColor }}
                >
                  {item.catLabel}
                </span>
                <p className="flex-1 text-sm text-gray-700 group-hover:text-hwaseong-blue transition-colors line-clamp-1">
                  {item.title}
                  {item.isNew && (
                    <span className="ml-2 text-xs text-red-500 font-bold">NEW</span>
                  )}
                </p>
                <span className="text-xs text-gray-400 flex-shrink-0">{item.date}</span>
              </div>
            ))}
            {filteredNews.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-10">해당 카테고리의 소식이 없습니다.</p>
            )}
          </div>
        </div>
      </section>

      {/* ══ 서비스 흐름 ══════════════════════════ */}
      <section id="flow" className="bg-[#eef3f9] py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-14 text-center">
            <p className="text-hwaseong-skyblue text-sm font-semibold tracking-widest uppercase mb-3">
              How It Works
            </p>
            <h2 className="text-4xl sm:text-5xl font-bold text-hwaseong-text tracking-tight">
              플랫폼 서비스 흐름
            </h2>
            <div className="w-12 h-1 bg-hwaseong-blue rounded-full mt-6 mx-auto" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {SERVICE_FLOW.map((item) => (
              <div
                key={item.step}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative hover:shadow-md transition-shadow"
              >
                <span className="absolute -top-3.5 left-5 bg-hwaseong-blue text-white text-xs font-bold px-3 py-0.5 rounded-full">
                  STEP {item.step}
                </span>
                <span className="text-4xl block mb-4 mt-2">{item.icon}</span>
                <h3 className="font-bold text-hwaseong-text text-sm mb-2">{item.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FOOTER ═══════════════════════════════ */}
      <Footer />
    </>
  );
}
