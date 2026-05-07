import { useState, useEffect } from "react";
import Link from "next/link";

const NAV = [
  {
    label: "플랫폼 소개",
    subs: [
      { label: "소개 및 비전",  href: "#about" },
      { label: "추진 경과",     href: "#about" },
      { label: "운영 체계",     href: "#flow"  },
    ],
  },
  {
    label: "교육 프로그램",
    subs: [
      { label: "STEP 1 · AI 기초 소양", href: "#programs" },
      { label: "STEP 2 · AI 시민 리더", href: "#programs" },
      { label: "STEP 3 · 기업 맞춤형",  href: "#programs" },
      { label: "강사 파견 신청",         href: "#dispatch"  },
    ],
  },
  {
    label: "강사 찾기",
    subs: [
      { label: "강사 명단",      href: "#instructors" },
      { label: "강사 포트폴리오", href: "#instructors" },
      { label: "파견 요청하기",   href: "#dispatch"    },
    ],
  },
  {
    label: "활동 현황",
    subs: [
      { label: "교육 실적", href: "#stats" },
      { label: "통계 현황", href: "#stats" },
      { label: "성과 자료", href: "#stats" },
    ],
  },
  {
    label: "알림마당",
    subs: [
      { label: "공지사항", href: "#notice" },
      { label: "교육 일정", href: "#notice" },
      { label: "보도자료",  href: "#notice" },
    ],
  },
];

export default function GNB() {
  const [scrolled, setScrolled]         = useState(false);
  const [mobileOpen, setMobileOpen]     = useState(false);
  const [activeMenu, setActiveMenu]     = useState<string | null>(null);
  const [openMobileSub, setOpenMobileSub] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isLight = scrolled || mobileOpen;

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isLight ? "bg-white shadow-md" : "bg-transparent"
        }`}
      >
        {/* Utility bar */}
        <div
          className={`transition-colors duration-300 border-b ${
            isLight ? "bg-gray-50 border-gray-100" : "bg-hwaseong-blue/70 border-white/10"
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center py-1.5">
            <span className={`text-xs ${isLight ? "text-gray-500" : "text-blue-200"}`}>
              화성특례시 AI 혁신학교 AI랩
            </span>
            <span className={`text-xs hidden sm:block ${isLight ? "text-gray-500" : "text-blue-200"}`}>
              AI스마트전략실 031-5189-1757
            </span>
          </div>
        </div>

        {/* Main nav row */}
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[68px] flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 flex-shrink-0">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 ${
                isLight ? "bg-hwaseong-blue" : "bg-white/90"
              }`}
            >
              <span
                className={`font-bold text-[10px] leading-tight text-center ${
                  isLight ? "text-white" : "text-hwaseong-blue"
                }`}
              >
                화성<br />시
              </span>
            </div>
            <div className="leading-tight">
              <p className={`text-[10px] font-medium tracking-wide transition-colors ${isLight ? "text-gray-400" : "text-blue-200"}`}>
                Hwaseong Special City
              </p>
              <p className={`font-bold text-[15px] transition-colors ${isLight ? "text-hwaseong-blue" : "text-white"}`}>
                화성 AI 리더 허브
              </p>
            </div>
          </Link>

          {/* Desktop nav items */}
          <div className="hidden lg:flex items-center h-full">
            {NAV.map((item) => (
              <div
                key={item.label}
                className="relative h-full flex items-center"
                onMouseEnter={() => setActiveMenu(item.label)}
                onMouseLeave={() => setActiveMenu(null)}
              >
                <button
                  className={`px-5 h-full text-[15px] font-medium transition-colors duration-200 ${
                    isLight
                      ? "text-gray-700 hover:text-hwaseong-blue"
                      : "text-white hover:text-blue-200"
                  } ${activeMenu === item.label ? (isLight ? "text-hwaseong-blue" : "text-blue-200") : ""}`}
                >
                  {item.label}
                </button>

                {/* Dropdown */}
                {activeMenu === item.label && (
                  <div className="absolute top-full left-0 bg-white rounded-xl shadow-xl border border-gray-100 py-2 min-w-[190px] z-50">
                    {item.subs.map((sub) => (
                      <a
                        key={sub.label}
                        href={sub.href}
                        className="block px-5 py-2.5 text-sm text-gray-600 hover:text-hwaseong-blue hover:bg-hwaseong-light transition-colors"
                      >
                        {sub.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center gap-2">
            <Link
              href="/login"
              className={`px-4 py-2 text-sm font-semibold border-2 rounded-lg transition-colors ${
                isLight
                  ? "text-hwaseong-blue border-hwaseong-blue hover:bg-hwaseong-light"
                  : "text-white border-white/60 hover:bg-white/15"
              }`}
            >
              로그인
            </Link>
            <a href="#roles">
              <button
                className={`px-4 py-2 text-sm font-semibold rounded-lg shadow transition-colors ${
                  isLight
                    ? "bg-hwaseong-blue text-white hover:bg-blue-900"
                    : "bg-white text-hwaseong-blue hover:bg-blue-50"
                }`}
              >
                시작하기 →
              </button>
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            className={`lg:hidden p-2 rounded-lg transition-colors ${
              isLight ? "text-gray-700 hover:bg-gray-100" : "text-white hover:bg-white/10"
            }`}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="메뉴"
          >
            {mobileOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </nav>
      </header>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-72 bg-white z-50 shadow-2xl transition-transform duration-300 lg:hidden ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="bg-hwaseong-blue text-white px-5 py-4 flex items-center justify-between">
          <span className="font-bold text-sm">화성 AI 리더 허브</span>
          <button onClick={() => setMobileOpen(false)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto h-full pb-32">
          {NAV.map((item) => (
            <div key={item.label} className="border-b border-gray-100">
              <button
                className="w-full flex items-center justify-between px-5 py-4 text-left font-medium text-gray-800 text-sm"
                onClick={() =>
                  setOpenMobileSub(openMobileSub === item.label ? null : item.label)
                }
              >
                <span>{item.label}</span>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${openMobileSub === item.label ? "rotate-180" : ""}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openMobileSub === item.label && (
                <div className="bg-gray-50 pb-2">
                  {item.subs.map((sub) => (
                    <a
                      key={sub.label}
                      href={sub.href}
                      className="block px-8 py-2.5 text-sm text-gray-600 hover:text-hwaseong-blue"
                      onClick={() => setMobileOpen(false)}
                    >
                      {sub.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="px-5 pt-5 space-y-2">
            <Link
              href="/login"
              className="w-full block py-3 border-2 border-hwaseong-blue text-hwaseong-blue rounded-lg font-semibold text-sm text-center"
              onClick={() => setMobileOpen(false)}
            >
              로그인
            </Link>
            <a href="#roles" onClick={() => setMobileOpen(false)}>
              <button className="w-full py-3 bg-hwaseong-blue text-white rounded-lg font-semibold text-sm hover:bg-blue-900 transition-colors">
                시작하기 →
              </button>
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
