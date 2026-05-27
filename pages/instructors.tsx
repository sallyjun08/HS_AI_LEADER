import Head from "next/head";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import GNB from "@/components/GNB";
import Footer from "@/components/Footer";
import { useAuth } from "@/lib/auth-context";

type PublicLeader = {
  id: string;
  maskedName: string;
  isVerified: boolean;
  specialties: string[];
  availableRegions: string[];
  bio: string | null;
  ratingAvg: number;
  totalLectures: number;
};

const SPECIALTY_GROUPS = [
  { group: "AI 기초·윤리",    items: ["생성형 AI", "ChatGPT 활용", "AI 윤리", "AI 리터러시", "미디어 리터러시"] },
  { group: "프로그래밍·데이터", items: ["파이썬 기초", "데이터 분석", "코딩 기초", "노코드 도구", "엑셀·자동화"]  },
  { group: "창의·융합",        items: ["메이커 교육", "로봇 코딩", "AI 예술", "SW 융합", "디지털 리터러시"]    },
  { group: "비즈니스·실무",    items: ["AI 업무 혁신", "챗봇 활용", "영상 제작", "소셜미디어", "AI 마케팅"]    },
];

const REGION_ZONES = [
  { zone: "동부권", items: ["동탄1동", "동탄2동", "동탄면", "기흥"] },
  { zone: "남부권", items: ["봉담읍", "향남읍", "발안", "팔탄면"] },
  { zone: "서부권", items: ["남양읍", "마도면", "서신면", "우정읍", "장안면"] },
  { zone: "북부권", items: ["병점동", "기산동", "안녕동", "진안동"] },
];

const ACCENTS = [
  "from-blue-600 to-blue-800",
  "from-indigo-500 to-blue-700",
  "from-sky-500 to-blue-600",
  "from-teal-500 to-cyan-700",
  "from-violet-500 to-blue-700",
  "from-blue-500 to-indigo-600",
];

function Stars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} className={`w-3 h-3 ${i <= Math.round(value) ? "text-amber-400" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="text-xs font-bold text-amber-600 ml-1">{value.toFixed(1)}</span>
    </div>
  );
}

function InstructorCard({ leader, dispatchHref, idx }: { leader: PublicLeader; dispatchHref: string; idx: number }) {
  const accent = ACCENTS[idx % ACCENTS.length];
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col overflow-hidden">
      {/* 상단 컬러 밴드 */}
      <div className={`bg-gradient-to-r ${accent} px-5 pt-5 pb-9 relative`}>
        {leader.isVerified ? (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-full shadow-sm">
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
            공식 인증
          </span>
        ) : (
          <span className="absolute top-3 right-3 text-[10px] text-white/60 bg-white/10 px-2 py-0.5 rounded-full">인증 준비</span>
        )}
        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center text-white font-black text-xl">
          {leader.maskedName[0]}
        </div>
      </div>

      {/* 바디 */}
      <div className="px-5 pb-5 flex flex-col flex-1 -mt-4">
        {/* 이름 카드 + 별점 */}
        <div className="flex items-end justify-between gap-2 mb-3">
          <div className="min-w-0 flex-1 bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-sm">
            <p className="font-bold text-hwaseong-text text-sm leading-tight break-keep">{leader.maskedName} 강사</p>
          </div>
          <div className="text-right flex-shrink-0">
            <Stars value={leader.ratingAvg} />
            <p className="text-[10px] text-gray-400 mt-0.5">{leader.totalLectures}회 강의</p>
          </div>
        </div>

        {/* 소개 */}
        {leader.bio && (
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3">{leader.bio}</p>
        )}

        {/* 전문 분야 */}
        {leader.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {leader.specialties.slice(0, 4).map((s) => (
              <span key={s} className="text-[10px] bg-hwaseong-blue/8 text-hwaseong-blue border border-hwaseong-blue/15 px-2 py-0.5 rounded-full font-medium">
                {s}
              </span>
            ))}
            {leader.specialties.length > 4 && (
              <span className="text-[10px] text-gray-400 self-center">+{leader.specialties.length - 4}</span>
            )}
          </div>
        )}

        {/* 지역 */}
        {leader.availableRegions.length > 0 && (
          <div className="flex items-center gap-1 text-[11px] text-gray-500 mb-4">
            <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="line-clamp-1">
              {leader.availableRegions.slice(0, 3).join(" · ")}
              {leader.availableRegions.length > 3 && ` 외 ${leader.availableRegions.length - 3}`}
            </span>
          </div>
        )}

        <Link
          href={dispatchHref}
          className="mt-auto block w-full py-2.5 bg-hwaseong-blue text-white text-sm font-semibold text-center rounded-xl hover:bg-blue-900 transition-colors"
        >
          파견 신청하기
        </Link>
      </div>
    </div>
  );
}

export default function InstructorsPage() {
  const { user } = useAuth();
  const [leaders, setLeaders] = useState<PublicLeader[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("");

  const dispatchHref = user?.role === "client" ? "/dashboard/client" : "/login?redirect=/dashboard/client";

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (verifiedOnly) params.set("verified", "true");
    fetch(`/api/public/leaders?${params}`)
      .then((r) => r.json())
      .then((data) => setLeaders(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [verifiedOnly]);

  const filtered = useMemo(() => {
    let list = leaders;
    const kw = search.trim().toLowerCase();
    if (kw) {
      list = list.filter(
        (l) =>
          l.specialties.some((s) => s.toLowerCase().includes(kw)) ||
          l.availableRegions.some((r) => r.includes(kw)) ||
          (l.bio ?? "").toLowerCase().includes(kw)
      );
    }
    if (selectedSpecialty) {
      list = list.filter((l) => l.specialties.includes(selectedSpecialty));
    }
    if (selectedRegion) {
      const zone = REGION_ZONES.find((z) => z.zone === selectedRegion);
      if (zone) {
        list = list.filter((l) => l.availableRegions.some((r) => zone.items.includes(r)));
      }
    }
    return list;
  }, [leaders, search, selectedSpecialty, selectedRegion]);

  const verifiedCount = leaders.filter((l) => l.isVerified).length;

  return (
    <>
      <Head>
        <title>강사 찾기 | 화성 AI 시민리더 잇다(IT-DA)</title>
        <meta name="description" content="화성특례시 공식 AI 교육 강사를 검색하고 파견을 신청해보세요." />
      </Head>

      <GNB />

      <main className="min-h-screen bg-gray-50 pt-[108px] pb-20">

        {/* ── 히어로 ── */}
        <div className="relative bg-gradient-to-br from-[#001845] via-[#004C97] to-[#003d7a] text-white overflow-hidden">
          {/* 장식 원 */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/5" />
            <div className="absolute -bottom-10 -left-10 w-60 h-60 rounded-full bg-white/5" />
          </div>

          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <p className="text-blue-300 text-sm font-semibold tracking-widest uppercase mb-4">Find Instructors</p>
            <h1 className="text-3xl sm:text-5xl font-black mb-4 leading-tight">
              화성시 AI 전문 강사를 찾아보세요
            </h1>
            <p className="text-blue-200 text-sm sm:text-base max-w-xl mx-auto mb-8">
              화성특례시 공인 AI 시민 리더 강사들이 학교·기업·기관으로 직접 찾아갑니다
            </p>

            {/* 통계 뱃지 */}
            <div className="flex justify-center gap-3 flex-wrap mb-10">
              <span className="inline-flex items-center gap-2 bg-white/15 border border-white/25 text-sm font-semibold px-4 py-2 rounded-full backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                총 {leaders.length}명 강사
              </span>
              <span className="inline-flex items-center gap-2 bg-white/15 border border-white/25 text-sm font-semibold px-4 py-2 rounded-full backdrop-blur-sm">
                🏅 공식 인증 {verifiedCount}명
              </span>
            </div>

            {/* 검색창 */}
            <div className="max-w-lg mx-auto relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="전문 분야, 지역으로 검색 (예: 생성형 AI, 동탄)"
                className="w-full pl-12 pr-4 py-4 rounded-2xl text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 shadow-lg"
              />
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">

          {/* ── 필터 바 ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-8">
            <div className="flex flex-wrap gap-y-4 gap-x-6 items-center">

              {/* 지역 */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-xs font-bold text-gray-500 whitespace-nowrap">지역</span>
                {[{ zone: "전체", items: [] }, ...REGION_ZONES].map(({ zone }) => (
                  <button
                    key={zone}
                    onClick={() => setSelectedRegion(zone === "전체" ? "" : zone === selectedRegion ? "" : zone)}
                    className={`px-3.5 py-1.5 text-xs rounded-lg font-semibold transition-colors ${
                      (zone === "전체" && !selectedRegion) || selectedRegion === zone
                        ? "bg-hwaseong-blue text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {zone}
                  </button>
                ))}
              </div>

              <div className="w-px h-5 bg-gray-200 hidden sm:block" />

              {/* 분야 */}
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-bold text-gray-500">분야</span>
                <select
                  value={selectedSpecialty}
                  onChange={(e) => setSelectedSpecialty(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-hwaseong-blue bg-gray-50"
                >
                  <option value="">전체</option>
                  {SPECIALTY_GROUPS.map(({ group, items }) => (
                    <optgroup key={group} label={group}>
                      {items.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="w-px h-5 bg-gray-200 hidden sm:block" />

              {/* 인증 토글 */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  onClick={() => setVerifiedOnly(!verifiedOnly)}
                  className={`w-10 h-5 rounded-full transition-colors flex items-center ${verifiedOnly ? "bg-hwaseong-blue" : "bg-gray-200"}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-0.5 ${verifiedOnly ? "translate-x-5" : "translate-x-0"}`} />
                </div>
                <span className="text-xs text-gray-600 font-medium">공식 인증만</span>
              </label>

              {/* 결과 수 */}
              <div className="ml-auto flex items-center gap-2">
                {(search || selectedRegion || selectedSpecialty || verifiedOnly) && (
                  <button
                    onClick={() => { setSearch(""); setSelectedRegion(""); setSelectedSpecialty(""); setVerifiedOnly(false); }}
                    className="text-xs text-gray-400 hover:text-gray-600 underline"
                  >
                    초기화
                  </button>
                )}
                <span className="text-xs font-bold text-hwaseong-blue bg-hwaseong-blue/8 px-3 py-1 rounded-full">
                  {loading ? "검색 중..." : `${filtered.length}명`}
                </span>
              </div>
            </div>
          </div>

          {/* ── 결과 그리드 ── */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="rounded-2xl bg-white border border-gray-100 overflow-hidden shadow-sm">
                  <div className="h-24 bg-gray-200 animate-pulse" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-gray-100 animate-pulse rounded w-2/3" />
                    <div className="h-3 bg-gray-100 animate-pulse rounded w-full" />
                    <div className="h-3 bg-gray-100 animate-pulse rounded w-4/5" />
                    <div className="h-9 bg-gray-100 animate-pulse rounded-xl mt-4" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-28">
              <p className="text-5xl mb-4">🔍</p>
              <p className="text-base font-bold text-gray-600 mb-2">조건에 맞는 강사가 없습니다</p>
              <p className="text-sm text-gray-400">검색어나 필터를 조정해 보세요</p>
              <button
                onClick={() => { setSearch(""); setSelectedRegion(""); setSelectedSpecialty(""); setVerifiedOnly(false); }}
                className="mt-6 px-5 py-2.5 bg-hwaseong-blue text-white text-sm font-semibold rounded-xl hover:bg-blue-900 transition-colors"
              >
                필터 초기화
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((leader, idx) => (
                <InstructorCard key={leader.id} leader={leader} dispatchHref={dispatchHref} idx={idx} />
              ))}
            </div>
          )}

          {/* ── 하단 CTA (비로그인 시) ── */}
          {!user && filtered.length > 0 && (
            <div className="mt-12 bg-gradient-to-r from-hwaseong-blue to-[#003fa3] rounded-2xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="text-white text-center sm:text-left">
                <p className="text-lg font-bold mb-1">강사 파견을 신청하려면 로그인이 필요합니다</p>
                <p className="text-blue-200 text-sm">수요처(기관·기업·학교) 계정으로 로그인하면 바로 신청할 수 있습니다</p>
              </div>
              <div className="flex gap-3 flex-shrink-0">
                <Link href="/login" className="px-5 py-2.5 bg-white/15 border-2 border-white/40 text-white text-sm font-semibold rounded-xl hover:bg-white/25 transition-colors">
                  로그인
                </Link>
                <Link href="/register" className="px-5 py-2.5 bg-white text-hwaseong-blue text-sm font-semibold rounded-xl hover:bg-blue-50 transition-colors">
                  회원가입 →
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
