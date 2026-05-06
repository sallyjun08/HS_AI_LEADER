import Link from "next/link";

const LINK_GROUPS = [
  {
    title: "플랫폼",
    links: [
      { label: "소개 및 비전",     href: "#about" },
      { label: "운영 체계",         href: "#flow" },
      { label: "이용 약관",         href: "/terms" },
      { label: "개인정보처리방침",  href: "/privacy" },
    ],
  },
  {
    title: "교육 프로그램",
    links: [
      { label: "STEP 1 · AI 기초",  href: "#programs" },
      { label: "STEP 2 · 시민 리더", href: "#programs" },
      { label: "STEP 3 · 기업 교육", href: "#programs" },
      { label: "강사 파견 신청",     href: "#dispatch" },
    ],
  },
  {
    title: "대시보드",
    links: [
      { label: "피교육자 (시민·기관)", href: "/dashboard/learner" },
      { label: "강사 (AI 시민 리더)",  href: "/dashboard/instructor" },
      { label: "운영자 (화성시)",       href: "/dashboard/operator" },
    ],
  },
];

const SNS = [
  {
    label: "YouTube",
    href: "#",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2C0 8 0 12 0 12s0 4 .5 5.8a3 3 0 0 0 2.1 2.1C4.5 20.4 12 20.4 12 20.4s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1C24 16 24 12 24 12s0-4-.5-5.8zM9.8 15.4V8.6l6.3 3.4-6.3 3.4z" />
      </svg>
    ),
  },
  {
    label: "Instagram",
    href: "#",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.2c3.2 0 3.6 0 4.9.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8 0 3.2 0 3.6-.1 4.8-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.9.1-3.2 0-3.6 0-4.8-.1-3.3-.1-4.8-1.7-4.9-4.9C2.2 15.6 2.2 15.3 2.2 12c0-3.2 0-3.6.1-4.8C2.4 3.9 4 2.3 7.2 2.3c1.2-.1 1.6-.1 4.8-.1zm0-2.2C8.7 0 8.3 0 7.1.1 2.7.3.3 2.7.1 7.1 0 8.3 0 8.7 0 12c0 3.3 0 3.7.1 4.9.2 4.4 2.6 6.8 7 7C8.3 24 8.7 24 12 24c3.3 0 3.7 0 4.9-.1 4.4-.2 6.8-2.6 7-7 .1-1.2.1-1.6.1-4.9 0-3.3 0-3.7-.1-4.9C23.7 2.7 21.3.3 16.9.1 15.7 0 15.3 0 12 0zm0 5.8a6.2 6.2 0 1 0 0 12.4A6.2 6.2 0 0 0 12 5.8zm0 10.2a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.4-11.8a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8z" />
      </svg>
    ),
  },
  {
    label: "Naver Blog",
    href: "#",
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M16.3 12.7L7.4 0H0v24h7.7V11.3L16.6 24H24V0h-7.7v12.7z" />
      </svg>
    ),
  },
];

export default function Footer() {
  return (
    <footer className="bg-hwaseong-blue text-white">

      {/* ── 상단: 링크 그리드 + SNS ── */}
      <div className="border-b border-blue-700/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-hwaseong-blue font-bold text-[10px] leading-tight text-center">
                    화성<br />시
                  </span>
                </div>
                <div>
                  <p className="text-[10px] text-blue-300 font-medium">Hwaseong Special City</p>
                  <p className="font-bold text-sm">화성 AI 리더 허브</p>
                </div>
              </div>
              <p className="text-blue-300 text-xs leading-relaxed mb-6">
                화성특례시 AI 혁신학교 AI랩이 운영하는 시민 리더 양성 통합 관리 플랫폼입니다.
              </p>

              {/* SNS icons */}
              <div className="flex gap-2">
                {SNS.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    aria-label={s.label}
                    className="w-9 h-9 bg-blue-700/60 hover:bg-white hover:text-hwaseong-blue text-blue-200 rounded-full flex items-center justify-center transition-colors"
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>

            {/* Link groups */}
            {LINK_GROUPS.map((group) => (
              <div key={group.title}>
                <h4 className="font-semibold text-sm text-blue-100 mb-4">{group.title}</h4>
                <ul className="space-y-2.5">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-blue-300 text-xs hover:text-white transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 하단: 기관 정보 + 저작권 ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="text-blue-300 text-xs space-y-1">
            <p className="font-semibold text-white text-sm">화성특례시 AI 시민 리더 양성 플랫폼</p>
            <p>📍 AI 혁신센터 본원 — 스마트통합운영센터 4층</p>
            <p>📞 AI스마트전략실 031-5189-1757</p>
          </div>
          <p className="text-blue-400 text-xs flex-shrink-0">
            © 2026 Hwaseong Special City. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
