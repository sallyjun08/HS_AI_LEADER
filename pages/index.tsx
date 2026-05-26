import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { Sparkles, ShieldCheck, ClipboardList } from "lucide-react";
import GNB from "@/components/GNB";
import LiveCountBanner from "@/components/LiveCountBanner";
import Footer from "@/components/Footer";
import { useAuth, ROLE_REDIRECTS } from "@/lib/auth-context";

/* ─── Hero slides ─────────────────────────────── */
const HERO_SLIDES = [
  {
    bg: "from-[#001845] via-[#004C97] to-[#003d7a]",
    badge: "2026 AI 혁신학교 AI랩 운영 중",
    desc: "",
    img: "/hero-1.png",
  },
  {
    bg: "from-[#001133] via-[#004C97] to-[#003060]",
    badge: "AI 시민 리더 47명 현재 활동 중",
    desc: "",
    img: "/hero-2.png",
  },
  {
    bg: "from-[#0d1b42] via-[#004C97] to-[#1a3a7a]",
    badge: "누적 교육 횟수 156회 달성",
    desc: "",
    img: "/hero-3.png",
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


/* ─── Network background SVG ──────────────────── */
const NET_NODES = [
  {x:4,  y:8,  r:1.2, d:0   }, {x:18, y:4,  r:0.8, d:0.4 },
  {x:35, y:11, r:1.0, d:0.8 }, {x:52, y:5,  r:1.4, d:1.2 },
  {x:68, y:10, r:0.9, d:0.6 }, {x:84, y:4,  r:1.1, d:1.5 },
  {x:97, y:11, r:0.7, d:0.2 }, {x:10, y:35, r:1.3, d:0.9 },
  {x:28, y:42, r:0.9, d:0.3 }, {x:45, y:33, r:1.5, d:1.1 },
  {x:52, y:50, r:2.0, d:0.5 }, {x:62, y:38, r:1.0, d:1.4 },
  {x:78, y:44, r:1.2, d:0.7 }, {x:94, y:36, r:0.8, d:1.8 },
  {x:6,  y:68, r:0.9, d:1.0 }, {x:22, y:74, r:1.1, d:0.1 },
  {x:40, y:65, r:1.3, d:1.6 }, {x:55, y:72, r:0.8, d:0.8 },
  {x:72, y:67, r:1.0, d:1.2 }, {x:88, y:74, r:1.2, d:0.4 },
  {x:97, y:60, r:0.7, d:1.7 }, {x:35, y:55, r:1.1, d:0.6 },
  {x:62, y:22, r:1.3, d:1.3 },
];
const NET_EDGES = [
  [0,1],[1,2],[2,3],[3,4],[4,5],[5,6],
  [0,7],[1,7],[2,8],[3,9],[3,22],[4,22],[4,11],[5,12],[6,12],[6,13],
  [7,8],[8,9],[9,10],[10,11],[11,12],[12,13],
  [7,14],[8,15],[9,16],[10,16],[10,17],[11,18],[12,18],[12,19],[13,20],
  [14,15],[15,16],[16,17],[17,18],[18,19],[19,20],
  [8,21],[9,21],[21,10],[21,16],
];

function NetworkBg() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {NET_EDGES.map(([a, b], i) => (
        <line
          key={i}
          x1={NET_NODES[a].x} y1={NET_NODES[a].y}
          x2={NET_NODES[b].x} y2={NET_NODES[b].y}
          stroke="white" strokeOpacity={0.12} strokeWidth={0.25}
        />
      ))}
      {NET_NODES.map((n, i) => (
        <circle key={i} cx={n.x} cy={n.y} r={n.r} fill="white" fillOpacity={0.2}>
          <animate attributeName="fill-opacity" values="0.1;0.4;0.1"
            dur={`${2 + (i % 3)}s`} begin={`${n.d}s`} repeatCount="indefinite" />
          <animate attributeName="r" values={`${n.r};${n.r * 1.5};${n.r}`}
            dur={`${2 + (i % 3)}s`} begin={`${n.d}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </svg>
  );
}

/* ══════════════════════════════════════════════ */
export default function Landing() {
  const { user } = useAuth();
  const [slide, setSlide]     = useState(0);
  const [newsTab, setNewsTab] = useState<NewsTab>("all");

  type PreviewLeader = {
    id: string;
    maskedName: string;
    isVerified: boolean;
    specialties: string[];
    availableRegions: string[];
    bio: string | null;
    ratingAvg: number;
    totalLectures: number;
  };
  const [previewLeaders, setPreviewLeaders] = useState<PreviewLeader[]>([]);

  useEffect(() => {
    fetch("/api/public/leaders?verified=true")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setPreviewLeaders(data.slice(0, 3));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % HERO_SLIDES.length), 4500);
    return () => clearInterval(t);
  }, []);

  const filteredNews =
    newsTab === "all" ? NEWS_ITEMS : NEWS_ITEMS.filter((n) => n.cat === newsTab);

  return (
    <>
      <Head>
        <title>화성 AI 시민리더 잇다(IT-DA) — 화성특례시 AI 시민 리더 양성 플랫폼</title>
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
            className={`absolute inset-0 transition-opacity duration-1000 ${
              i === slide ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${s.bg}`} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.img}
              alt=""
              className="absolute top-[100px] left-0 right-0 bottom-0 w-full h-[calc(100%-100px)] object-cover opacity-30"
            />
          </div>
        ))}

          {/* Network animation background */}
        <NetworkBg />

        {/* Decorative radial glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-[#004C97]/30 blur-3xl" />
          <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-white/5" />
        </div>

        {/* Content — top padding clears the fixed GNB (~100px) */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-36 pb-32 min-h-screen flex flex-col items-center justify-center text-center">
          {/* Badge */}
          <span className="inline-flex items-center gap-2 bg-white/15 border border-white/25 text-xs font-semibold px-4 py-1.5 rounded-full mb-8 backdrop-blur-sm text-white">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            {HERO_SLIDES[slide].badge}
          </span>

          {/* Main slogan */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-tight tracking-tight mb-4">
            화성의 인재<span className="text-yellow-300">(人)</span>를<br />
            지역 사회와 <span className="text-yellow-300">잇다,</span>
          </h1>
          <p className="text-xl sm:text-2xl font-semibold text-blue-200 mb-10 tracking-wide">
            미래 교육의 가치를 잇다.
          </p>

          {/* CTA */}
          <div className="flex flex-wrap gap-4 justify-center">
            {user ? (
              <Link href={ROLE_REDIRECTS[user.role]}>
                <button className="px-8 py-4 bg-white text-hwaseong-blue font-bold text-base rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
                  {{ leader: "강사 대시보드 입장하기", client: "수요처 대시보드 입장하기", admin: "운영자 대시보드 입장하기" }[user.role]} →
                </button>
              </Link>
            ) : (
              <>
                <Link href="/register?role=leader">
                  <button className="px-8 py-4 bg-white text-hwaseong-blue font-bold text-base rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
                    시민 리더로 참여하기 →
                  </button>
                </Link>
                <Link href="/register?role=client">
                  <button className="px-8 py-4 bg-white/15 border-2 border-white/60 text-white font-bold text-base rounded-xl hover:bg-white/25 backdrop-blur-sm transition-colors">
                    AI 교육 신청하기
                  </button>
                </Link>
              </>
            )}
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

      {/* ══ 플랫폼 소개 ══════════════════════════ */}
      <section id="about" className="bg-white py-24 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Section header */}
          <div className="mb-12 text-center">
            <p className="text-hwaseong-skyblue text-sm font-semibold tracking-widest uppercase mb-3">
              About Platform
            </p>
            <h2 className="text-4xl sm:text-5xl font-bold text-hwaseong-text tracking-tight">
              화성 AI 시민리더 잇다(IT-DA)란?
            </h2>
            <div className="w-12 h-1 bg-hwaseong-blue rounded-full mt-6 mx-auto" />
          </div>

          {/* Core message */}
          <div className="max-w-2xl mx-auto text-center mb-12">
            <p className="text-gray-700 text-xl leading-relaxed">
              화성시 내{" "}
              <strong className="text-hwaseong-blue font-bold">수요처</strong>
              <span className="text-gray-500 text-base">（학교·기관·기업）</span>와
              검증된{" "}
              <strong className="text-hwaseong-blue font-bold">시민 리더</strong>
              <span className="text-gray-500 text-base">（강사）</span>를{" "}
              데이터 기반으로 연결하는 전용 매칭 플랫폼입니다.
            </p>
            <p className="text-gray-500 text-base mt-4">
              구글 폼 수기 관리를 탈피해 신청·매칭·활동 보고까지 하나의 플랫폼에서 처리합니다.
            </p>
          </div>

          {/* Stats — 3단계 제거, 2개만 */}
          <div className="grid grid-cols-2 gap-6 max-w-xs mx-auto mb-16">
            {[
              { num: "47명",  label: "활동 중인 AI 리더" },
              { num: "156회", label: "누적 교육 실적"   },
            ].map((s) => (
              <div key={s.label} className="bg-[#eef3f9] rounded-2xl p-6 text-center">
                <p className="text-3xl font-bold text-hwaseong-blue">{s.num}</p>
                <p className="text-sm text-gray-600 mt-2 font-medium">{s.label}</p>
              </div>
            ))}
          </div>

          {/* 3-card feature grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 스마트 매칭 */}
            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all group">
              <div className="w-14 h-14 bg-hwaseong-light rounded-2xl flex items-center justify-center mb-6 group-hover:bg-hwaseong-blue transition-colors duration-200">
                <Sparkles className="w-7 h-7 text-hwaseong-blue group-hover:text-white transition-colors duration-200" />
              </div>
              <p className="text-xs font-bold text-hwaseong-skyblue uppercase tracking-widest mb-2">데이터 기반 최적화</p>
              <h3 className="text-xl font-bold text-hwaseong-text mb-3">스마트 매칭</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                <strong className="text-hwaseong-blue font-semibold">강사</strong>의 전문분야·활동 지역·시간대를 분석해{" "}
                <strong className="text-hwaseong-blue font-semibold">수요처</strong>에 가장 적합한 리더를 추천합니다.
              </p>
            </div>

            {/* 안심 프로세스 */}
            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all group">
              <div className="w-14 h-14 bg-hwaseong-light rounded-2xl flex items-center justify-center mb-6 group-hover:bg-hwaseong-blue transition-colors duration-200">
                <ShieldCheck className="w-7 h-7 text-hwaseong-blue group-hover:text-white transition-colors duration-200" />
              </div>
              <p className="text-xs font-bold text-hwaseong-skyblue uppercase tracking-widest mb-2">신뢰와 보안의 연결</p>
              <h3 className="text-xl font-bold text-hwaseong-text mb-3">안심 프로세스</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                매칭 확정 전 개인정보를 마스킹해 안전한 환경을 제공하고,
                화성시가 보증하는 <strong className="text-hwaseong-blue font-semibold">강사</strong> 풀을 관리합니다.
              </p>
            </div>

            {/* 행정 자동화 */}
            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all group">
              <div className="w-14 h-14 bg-hwaseong-light rounded-2xl flex items-center justify-center mb-6 group-hover:bg-hwaseong-blue transition-colors duration-200">
                <ClipboardList className="w-7 h-7 text-hwaseong-blue group-hover:text-white transition-colors duration-200" />
              </div>
              <p className="text-xs font-bold text-hwaseong-skyblue uppercase tracking-widest mb-2">간편한 활동 관리</p>
              <h3 className="text-xl font-bold text-hwaseong-text mb-3">행정 자동화</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                복잡한 서류 없이{" "}
                <strong className="text-hwaseong-blue font-semibold">수요처</strong> 신청부터
                활동 보고서 제출까지 웹에서 원스톱으로 처리합니다.
              </p>
            </div>
          </div>
        </div>
      </section>


{/* ══ LIVE COUNT ═══════════════════════════ */}
      <LiveCountBanner />

      {/* ══ 강사 찾기 ══════════════════════════ */}
      <section id="instructors" className="bg-gray-50 py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
            <div>
              <p className="text-hwaseong-skyblue text-sm font-semibold tracking-widest uppercase mb-3">
                Find Instructors
              </p>
              <h2 className="text-4xl sm:text-5xl font-bold text-hwaseong-text tracking-tight">
                강사 찾기
              </h2>
              <div className="w-12 h-1 bg-hwaseong-blue rounded-full mt-6" />
            </div>
            <Link
              href="/instructors"
              className="text-sm text-hwaseong-skyblue hover:underline font-medium flex-shrink-0"
            >
              강사 전체 보기 →
            </Link>
          </div>

          {previewLeaders.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {previewLeaders.map((l) => (
                <div key={l.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-hwaseong-blue/10 flex items-center justify-center text-hwaseong-blue font-black text-lg flex-shrink-0">
                        {l.maskedName[0]}
                      </div>
                      <div>
                        <p className="font-bold text-hwaseong-text text-base leading-tight">{l.maskedName} 강사</p>
                        {l.isVerified && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full mt-0.5">
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                            공식 인증
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-amber-500">⭐ {l.ratingAvg.toFixed(1)}</p>
                      <p className="text-[10px] text-gray-400">{l.totalLectures}회 강의</p>
                    </div>
                  </div>
                  {l.bio && (
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{l.bio}</p>
                  )}
                  {l.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {l.specialties.slice(0, 4).map((s) => (
                        <span key={s} className="text-[10px] bg-hwaseong-blue/8 text-hwaseong-blue border border-hwaseong-blue/15 px-2 py-0.5 rounded-full font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {[0, 1, 2].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 h-44 animate-pulse" />
              ))}
            </div>
          )}

          <div className="text-center">
            <Link
              href="/instructors"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-hwaseong-blue text-white font-semibold text-sm rounded-xl hover:bg-blue-900 transition-colors shadow-sm"
            >
              전체 강사 검색하기
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

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



      {/* ══ FOOTER ═══════════════════════════════ */}
      <Footer />
    </>
  );
}
