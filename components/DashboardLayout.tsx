import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth, type UserRole } from "@/lib/auth-context";

interface NavItem { icon: string; label: string; href: string }

const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  leader: [
    { icon: "📊", label: "현황",       href: "/dashboard/leader" },
    { icon: "🔗", label: "매칭 요청",  href: "/dashboard/leader/matches" },
    { icon: "📚", label: "내 강의",    href: "/dashboard/leader/lectures" },
    { icon: "👤", label: "프로필",     href: "/dashboard/leader/profile" },
    { icon: "🏆", label: "포트폴리오", href: "/dashboard/leader/portfolio" },
    { icon: "⚙️", label: "내 정보",   href: "/dashboard/settings" },
  ],
  client: [
    { icon: "📋", label: "내 매칭 요청", href: "/dashboard/client" },
    { icon: "⚙️", label: "내 정보",     href: "/dashboard/settings" },
  ],
  admin: [
    { icon: "📊", label: "통계",           href: "/dashboard/admin" },
    { icon: "🏅", label: "강사 관리",      href: "/admin/leaders" },
    { icon: "🔍", label: "요청 검토",      href: "/admin/review" },
    { icon: "🎯", label: "매칭 센터",      href: "/admin/matching-center" },
    { icon: "📋", label: "전체 요청 현황", href: "/admin/requests" },
    { icon: "💰", label: "보고서 및 정산", href: "/admin/settlement" },
    { icon: "🏢", label: "대여 설정",      href: "/admin/rental-settings" },
  ],
};

const ROLE_META: Record<UserRole, { label: string; badge: string; badgeStyle: string; avatarBg: string }> = {
  leader: { label: "AI 시민 리더",  badge: "강사",   badgeStyle: "bg-indigo-100 text-indigo-700", avatarBg: "from-hwaseong-blue to-indigo-600" },
  client: { label: "교육 수요처",   badge: "수요처", badgeStyle: "bg-green-100 text-green-700",   avatarBg: "from-green-600 to-teal-600" },
  admin:  { label: "화성시 관리자", badge: "관리자", badgeStyle: "bg-gray-100 text-gray-700",     avatarBg: "from-gray-700 to-gray-900" },
};

type AdminAlerts = { reviewing: number; pending: number; rejected: number; unverified: number };

interface Props { pageTitle: string; children: React.ReactNode }

export default function DashboardLayout({ pageTitle, children }: Props) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentHash, setCurrentHash] = useState("");

  const [adminAlerts, setAdminAlerts] = useState<AdminAlerts>({ reviewing: 0, pending: 0, rejected: 0, unverified: 0 });
  const [leaderOngoing, setLeaderOngoing] = useState(0);

  const fetchAdminAlerts = useCallback(async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [reqs, leaders]: [any[], any[]] = await Promise.all([
        fetch("/api/match-requests").then((r) => r.json()),
        fetch("/api/admin/leaders/list").then((r) => r.json()),
      ]);
      setAdminAlerts({
        reviewing:  Array.isArray(reqs)    ? reqs.filter((r) => r.status === "pending" && r.is_approved === false).length : 0,
        pending:    Array.isArray(reqs)    ? reqs.filter((r) => r.status === "pending" && r.is_approved === true).length : 0,
        rejected:   Array.isArray(reqs)    ? reqs.filter((r) => r.status === "rejected").length : 0,
        unverified: Array.isArray(leaders) ? leaders.filter((l) => !l.isVerified).length : 0,
      });
    } catch {}
  }, []);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    fetchAdminAlerts();
    const id = setInterval(fetchAdminAlerts, 30_000);
    return () => clearInterval(id);
  }, [user, fetchAdminAlerts]);

  useEffect(() => {
    if (!user || user.role !== "leader") return;
    const fetchLeaderOngoing = async () => {
      try {
        const data = await fetch("/api/match-requests").then((r) => r.json());
        if (Array.isArray(data))
          setLeaderOngoing(data.filter((m) => m.status === "ongoing").length);
      } catch {}
    };
    fetchLeaderOngoing();
    const onVisible = () => { if (document.visibilityState === "visible") fetchLeaderOngoing(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [user]);

  useEffect(() => {
    setCurrentHash(window.location.hash);
    const handler = () => setCurrentHash(window.location.hash);
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-hwaseong-gray flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-hwaseong-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const role = user.role as UserRole;
  const userName = user.name;
  const navItems = NAV_BY_ROLE[role] ?? [];
  const meta = ROLE_META[role];
  const initial = userName.charAt(0);

  const totalAlerts = adminAlerts.reviewing + adminAlerts.pending + adminAlerts.rejected + adminAlerts.unverified;

  function navBadge(href: string): number {
    if (role === "leader" && href === "/dashboard/leader/lectures") return leaderOngoing;
    if (role !== "admin") return 0;
    if (href === "/admin/leaders")         return adminAlerts.unverified;
    if (href === "/admin/review")          return adminAlerts.reviewing;
    if (href === "/admin/matching-center") return adminAlerts.pending + adminAlerts.rejected;
    return 0;
  }

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }


  return (
    <div className="min-h-screen bg-hwaseong-gray font-sans flex flex-col">
      {/* Top bar */}
      <header className="bg-hwaseong-blue text-white h-14 flex items-center px-4 sm:px-6 gap-3 shadow-lg z-30 flex-shrink-0">
        <button
          className="lg:hidden p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="사이드바 열기"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center">
            <span className="text-hwaseong-blue font-extrabold text-[7px] leading-tight text-center">AI<br />잇다</span>
          </div>
          <span className="font-bold text-sm hidden sm:block">화성 AI 시민리더 잇다</span>
        </Link>

        <span className="text-blue-300 text-sm hidden sm:block">/</span>
        <span className="text-white font-semibold text-sm truncate">{pageTitle}</span>

        <div className="ml-auto flex items-center gap-2">
          {role === "admin" && totalAlerts > 0 && (
            <div className="relative flex items-center">
              <span className="relative flex h-2 w-2 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              <span className="text-xs font-bold text-red-300">{totalAlerts}건 처리 필요</span>
            </div>
          )}
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full hidden sm:block ${meta.badgeStyle}`}>
            {meta.badge}
          </span>
          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${meta.avatarBg} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
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
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        <aside className={`fixed top-14 left-0 bottom-0 z-20 w-56 bg-white border-r border-gray-100 shadow-sm flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 lg:flex-shrink-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${meta.avatarBg} flex items-center justify-center text-white font-bold flex-shrink-0`}>
                {initial}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-hwaseong-text text-sm truncate">{userName}</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${meta.badgeStyle}`}>{meta.badge}</span>
              </div>
            </div>
          </div>

          <nav className="flex-1 py-3 overflow-y-auto">
            {navItems.map((item) => {
              const hrefPath = item.href.split("#")[0];
              const isActive = item.href.includes("#")
                ? `${router.pathname}${currentHash}` === item.href
                : router.pathname === hrefPath;
              const badge = navBadge(item.href);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm rounded-lg mx-2 transition-colors ${
                    isActive
                      ? "bg-hwaseong-blue/10 text-hwaseong-blue font-semibold"
                      : "text-gray-600 hover:text-hwaseong-blue hover:bg-hwaseong-light font-medium"
                  }`}
                >
                  <span className="text-base w-5 text-center">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {badge > 0 ? (
                    <span className="ml-auto min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1">
                      {badge}
                    </span>
                  ) : isActive ? (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-hwaseong-blue" />
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="p-3 border-t border-gray-100 space-y-1">
            <Link href="/" className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-hwaseong-blue rounded-lg hover:bg-hwaseong-light transition-colors">
              <span>←</span>
              <span>메인 페이지로</span>
            </Link>
            <button onClick={handleSignOut} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
              <span>↩</span>
              <span>로그아웃</span>
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {children}
          </div>
        </main>
      </div>

    </div>
  );
}
