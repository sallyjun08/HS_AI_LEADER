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

function Stars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className={`w-3 h-3 ${i <= Math.round(value) ? "text-amber-400" : "text-gray-200"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="text-xs font-bold text-amber-600 ml-1">{value.toFixed(1)}</span>
    </div>
  );
}

function InstructorCard({ leader, dispatchHref }: { leader: PublicLeader; dispatchHref: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-hwaseong-blue/10 flex items-center justify-center text-hwaseong-blue font-black text-lg flex-shrink-0">
            {leader.maskedName[0]}
          </div>
          <div>
            <p className="font-bold text-hwaseong-text text-base leading-tight">{leader.maskedName} 강사</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {leader.isVerified ? (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  공식 인증
                </span>
              ) : (
                <span className="text-[10px] text-gray-400 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded-full">인증 준비</span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <Stars value={leader.ratingAvg} />
          <p className="text-[10px] text-gray-400 mt-0.5">{leader.totalLectures}회 강의</p>
        </div>
      </div>

      {leader.bio && (
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{leader.bio}</p>
      )}

      {leader.specialties.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {leader.specialties.slice(0, 5).map((s) => (
            <span key={s} className="text-[10px] bg-hwaseong-blue/8 text-hwaseong-blue border border-hwaseong-blue/15 px-2 py-0.5 rounded-full font-medium">
              {s}
            </span>
          ))}
          {leader.specialties.length > 5 && (
            <span className="text-[10px] text-gray-400 px-1.5 py-0.5">+{leader.specialties.length - 5}</span>
          )}
        </div>
      )}

      {leader.availableRegions.length > 0 && (
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
          <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="line-clamp-1">{leader.availableRegions.slice(0, 4).join(", ")}{leader.availableRegions.length > 4 ? ` 외 ${leader.availableRegions.length - 4}` : ""}</span>
        </div>
      )}

      <Link
        href={dispatchHref}
        className="mt-auto block w-full py-2.5 bg-hwaseong-blue text-white text-sm font-semibold text-center rounded-xl hover:bg-blue-900 transition-colors"
      >
        파견 신청하기
      </Link>
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

  return (
    <>
      <Head>
        <title>강사 찾기 | 화성 AI 시민리더 잇다(IT-DA)</title>
        <meta name="description" content="화성특례시 공식 AI 교육 강사를 검색하고 파견을 신청해보세요." />
      </Head>

      <GNB />

      <main className="min-h-screen bg-gray-50 pt-[108px] pb-20">
        {/* 히어로 */}
        <div className="bg-gradient-to-br from-[#001845] via-[#004C97] to-[#003d7a] text-white py-14 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-blue-300 text-sm font-semibold tracking-widest uppercase mb-3">강사 찾기</p>
            <h1 className="text-3xl sm:text-4xl font-black mb-4 leading-tight">
              화성시 AI 전문 강사를<br className="sm:hidden" /> 찾아보세요
            </h1>
            <p className="text-blue-200 text-sm sm:text-base max-w-xl mx-auto">
              화성특례시 공인 AI 시민 리더 강사들이 학교·기업·기관으로 직접 찾아갑니다.
            </p>

            {/* 검색 */}
            <div className="mt-8 max-w-lg mx-auto relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="전문 분야, 지역으로 검색 (예: 생성형 AI, 동탄)"
                className="w-full pl-11 pr-4 py-3.5 rounded-xl text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          {/* 필터 바 */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6 flex flex-wrap items-center gap-3">
            {/* 지역 필터 */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500">지역</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setSelectedRegion("")}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                    selectedRegion === "" ? "bg-hwaseong-blue text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  전체
                </button>
                {REGION_ZONES.map(({ zone }) => (
                  <button
                    key={zone}
                    onClick={() => setSelectedRegion(selectedRegion === zone ? "" : zone)}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                      selectedRegion === zone ? "bg-hwaseong-blue text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {zone}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-px h-5 bg-gray-200 hidden sm:block" />

            {/* 분야 필터 */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500">분야</span>
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-700 focus:outline-none focus:ring-1 focus:ring-hwaseong-blue"
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

            {/* 인증 필터 */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                onClick={() => setVerifiedOnly(!verifiedOnly)}
                className={`w-10 h-5 rounded-full transition-colors flex items-center ${
                  verifiedOnly ? "bg-hwaseong-blue" : "bg-gray-200"
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-0.5 ${
                    verifiedOnly ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </div>
              <span className="text-xs text-gray-600 font-medium">공식 인증 강사만</span>
            </label>

            <p className="ml-auto text-xs text-gray-400">
              {loading ? "검색 중..." : `총 ${filtered.length}명`}
            </p>
          </div>

          {/* 결과 그리드 */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-8 h-8 border-4 border-hwaseong-blue border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24 text-gray-400">
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-sm font-medium">조건에 맞는 강사가 없습니다.</p>
              <p className="text-xs mt-1">검색어나 필터를 조정해 보세요.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((leader) => (
                <InstructorCard key={leader.id} leader={leader} dispatchHref={dispatchHref} />
              ))}
            </div>
          )}

          {/* 하단 CTA */}
          {!user && filtered.length > 0 && (
            <div className="mt-10 bg-gradient-to-r from-hwaseong-blue/5 to-indigo-50 border border-hwaseong-blue/15 rounded-2xl p-6 text-center">
              <p className="font-bold text-hwaseong-text mb-1">강사 파견을 신청하려면 로그인이 필요합니다</p>
              <p className="text-sm text-gray-500 mb-4">수요처(기관·기업·학교) 계정으로 로그인하면 바로 신청할 수 있습니다.</p>
              <div className="flex justify-center gap-3">
                <Link href="/login" className="px-5 py-2.5 border-2 border-hwaseong-blue text-hwaseong-blue text-sm font-semibold rounded-xl hover:bg-hwaseong-light transition-colors">
                  로그인
                </Link>
                <Link href="/register" className="px-5 py-2.5 bg-hwaseong-blue text-white text-sm font-semibold rounded-xl hover:bg-blue-900 transition-colors">
                  회원가입
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
