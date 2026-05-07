import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "@/lib/auth-context";
import type { UserRole } from "@/types/database";

interface NavItem {
  icon: string;
  label: string;
  href: string;
}

const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  learner: [
    { icon: "📊", label: "학습 현황",     href: "#summary" },
    { icon: "🗺️", label: "학습 로드맵",  href: "#roadmap" },
    { icon: "📚", label: "교육 과정 신청", href: "#courses" },
    { icon: "📤", label: "강사 파견 요청", href: "#dispatch" },
    { icon: "🏅", label: "이수 인증서",   href: "#cert" },
  ],
  instructor: [
    { icon: "👤", label: "내 프로필",       href: "#profile" },
    { icon: "📊", label: "임팩트 대시보드", href: "#kpi" },
    { icon: "🗺️", label: "스마트 매칭",   href: "/dashboard/matching" },
    { icon: "📅", label: "강의 일정",       href: "#schedule" },
    { icon: "📋", label: "활동 기록",       href: "#log" },
  ],
  operator: [
    { icon: "📊", label: "전체 현황", href: "#kpi" },
    { icon: "🔗", label: "매칭 관제", href: "#matching" },
    { icon: "👥", label: "강사 관리", href: "#instructors" },
    { icon: "📚", label: "과정 관리", href: "#courses" },
    { icon: "📈", label: "통계 분석", href: "#stats" },
  ],
};

const ROLE_META: Record<UserRole, { label: string; badge: string; badgeStyle: string; avatarBg: string }> = {
  learner: {
    label: "피교육자",
    badge: "학습자",
    badgeStyle: "bg-sky-100 text-sky-700",
    avatarBg: "from-sky-500 to-blue-600",
  },
  instructor: {
    label: "AI 시민 리더",
    badge: "강사",
    badgeStyle: "bg-indigo-100 text-indigo-700",
    avatarBg: "from-hwaseong-blue to-indigo-600",
  },
  operator: {
    label: "화성시 운영자",
    badge: "관리자",
    badgeStyle: "bg-green-100 text-green-700",
    avatarBg: "from-green-600 to-teal-600",
  },
};

interface Props {
  pageTitle: string;
  children: React.ReactNode;
}

export default function DashboardLayout({ pageTitle, children }: Props) {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-hwaseong-gray flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-hwaseong-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !profile) return null;

  const role = profile.role;
  const userName = profile.name;
  const navItems = NAV_BY_ROLE[role];
  const meta = ROLE_META[role];
  const initial = userName.charAt(0);

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-hwaseong-gray font-sans flex flex-col">
      {/* Top bar */}
      <header className="bg-hwaseong-blue text-white h-14 flex items-center px-4 sm:px-6 gap-3 shadow-lg z-30 flex-shrink-0">
        {/* Mobile: hamburger */}
        <button
          className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="사이드바 열기"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center">
            <span className="text-hwaseong-blue font-bold text-[8px] leading-tight text-center">
              화성
              <br />시
            </span>
          </div>
          <span className="font-bold text-sm hidden sm:block">화성 AI 리더 허브</span>
        </Link>

        <span className="text-blue-300 text-sm hidden sm:block">/</span>
        <span className="text-white font-semibold text-sm truncate">{pageTitle}</span>

        {/* Right: user chip + logout */}
        <div className="ml-auto flex items-center gap-2">
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full hidden sm:block ${meta.badgeStyle} bg-opacity-90`}
          >
            {meta.badge}
          </span>
          <div
            className={`w-8 h-8 rounded-full bg-gradient-to-br ${meta.avatarBg} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
          >
            {initial}
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-semibold leading-tight">{userName}</p>
            <p className="text-xs text-blue-300 leading-tight">{meta.label}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="ml-2 text-xs text-blue-300 hover:text-white transition-colors border border-blue-400/40 hover:border-white/60 rounded-lg px-2.5 py-1 hidden md:block"
          >
            로그아웃
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar backdrop (mobile) */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed top-14 left-0 bottom-0 z-20 w-56 bg-white border-r border-gray-100 shadow-sm flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 lg:flex-shrink-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* User mini-profile */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full bg-gradient-to-br ${meta.avatarBg} flex items-center justify-center text-white font-bold flex-shrink-0`}
              >
                {initial}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-hwaseong-text text-sm truncate">{userName}</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${meta.badgeStyle}`}>
                  {meta.badge}
                </span>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 py-3 overflow-y-auto">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:text-hwaseong-blue hover:bg-hwaseong-light rounded-lg mx-2 transition-colors"
              >
                <span className="text-base w-5 text-center">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </a>
            ))}
          </nav>

          {/* Bottom: home + logout */}
          <div className="p-3 border-t border-gray-100 space-y-1">
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-hwaseong-blue rounded-lg hover:bg-hwaseong-light transition-colors"
            >
              <span>←</span>
              <span>메인 페이지로 돌아가기</span>
            </Link>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
            >
              <span>↩</span>
              <span>로그아웃</span>
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
