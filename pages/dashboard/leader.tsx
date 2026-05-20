import Head from "next/head";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/lib/auth-context";
import DashboardLayout from "@/components/DashboardLayout";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// ─── 상수 ──────────────────────────────────────────────────────────────────

const CERT_LABELS: Record<number, { short: string; full: string; cls: string }> = {
  1: { short: "Lv.1", full: "AI 기초 이수",  cls: "bg-sky-100 text-sky-800 border-sky-200" },
  2: { short: "Lv.2", full: "AI 시민 리더",   cls: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  3: { short: "Lv.3", full: "AI 전문 강사",   cls: "bg-purple-100 text-purple-800 border-purple-200" },
};


// ─── 타입 ──────────────────────────────────────────────────────────────────

type ScheduleMaterial = {
  id: string;
  title: string;
  file_url: string;
  file_type: string | null;
  file_size_kb: number | null;
  created_at: string;
  uploader: { name: string; role: string } | null;
};

type ScheduleMatch = {
  id: string;
  title: string;
  category: string;
  start_date: string;
  end_date: string | null;
  address: string | null;
  notes: string | null;
  participant_count: number;
  target_age: string | null;
  frequency: string;
  location_type: string;
  client_profile: { name: string; email: string; phone: string | null } | null;
  materials: ScheduleMaterial[];
};

type MatchRequest = {
  id: string;
  title: string;
  category: string;
  target_age: string | null;
  participant_count: number;
  start_date: string;
  address: string | null;
  notes: string | null;
  frequency: string;
  location_type: string;
  status: string;
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
  match: { title: string; address: string | null } | null;
};

// ─── 헬퍼 ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
}

function StarRating({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-gray-300">미평가</span>;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} className={`w-3.5 h-3.5 ${i <= Math.round(value) ? "text-amber-400" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="text-xs font-bold text-amber-600 ml-1">{Number(value).toFixed(1)}</span>
    </div>
  );
}

const LOC_LABELS: Record<string, string> = { offline: "대면", online: "온라인", hybrid: "혼합" };
const FREQ_LABELS: Record<string, string> = { single: "1회성", regular: "정기" };

function mapUrl(service: "kakao" | "naver", address: string): string {
  const q = encodeURIComponent(address);
  return service === "kakao"
    ? `https://map.kakao.com/?q=${q}`
    : `https://map.naver.com/v5/search/${q}`;
}

function fileIcon(type: string | null): string {
  if (type === "pdf") return "📕";
  if (type === "pptx" || type === "ppt") return "📊";
  if (type === "docx" || type === "doc") return "📝";
  if (type === "image") return "🖼️";
  return "📄";
}

function fmtFileSize(kb: number | null): string {
  if (!kb) return "";
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

// ─── 섹션 헤더 ────────────────────────────────────────────────────────────

function SectionHeader({ icon, title, sub, badge }: { icon: string; title: string; sub: string; badge?: number }) {
  return (
    <div className="flex items-center gap-3 pb-1">
      <div className="w-9 h-9 bg-hwaseong-blue/10 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="font-black text-hwaseong-text text-base">{title}</h2>
          {badge ? (
            <span className="text-[10px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded-full leading-none">
              {badge}
            </span>
          ) : null}
        </div>
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────

export default function LeaderDashboard() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  const [matches, setMatches] = useState<MatchRequest[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [scheduleMatches, setScheduleMatches] = useState<ScheduleMatch[]>([]);
  const [expandedSchedule, setExpandedSchedule] = useState<string | null>(null);
  const [reportForm, setReportForm] = useState({
    matchId: "", lectureDate: "", attendeeCount: "", reportText: "", imageUrlsText: "",
  });
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportOk, setReportOk] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ matchId: string; title: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // ── 인증 리다이렉트 ──
  useEffect(() => {
    if (!loading && (!user || user.role !== "leader")) router.replace("/login");
  }, [loading, user, router]);

  // ── 토스트 자동 소멸 ──
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // ── 보고서 제출 성공 쿼리 처리 ──
  useEffect(() => {
    if (router.query.reportSuccess === "1") {
      setToast({ msg: "포트폴리오에 새로운 이력이 추가되었습니다 🎉", ok: true });
      router.replace("/dashboard/leader", undefined, { shallow: true });
    }
  }, [router.query.reportSuccess]);

  // ── 데이터 페치 ──
  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch("/api/match-requests").then((r) => r.json()),
      fetch("/api/activity-reports").then((r) => r.json()),
      fetch("/api/schedule").then((r) => r.json()).catch(() => []),
    ]).then(([m, r, s]) => {
      if (Array.isArray(m)) setMatches(m);
      if (Array.isArray(r)) setReports(r);
      if (Array.isArray(s)) setScheduleMatches(s);
    });
  }, [user]);

  // ── 스크롤스파이 (사이드바 active 동기화) ──
  useEffect(() => {
    if (!user) return;
    const ids = ["overview", "matches", "reports"];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (!visible.length) return;
        const topmost = visible.reduce((a, b) =>
          a.boundingClientRect.top < b.boundingClientRect.top ? a : b
        );
        const newHash = `#${topmost.target.id}`;
        if (window.location.hash !== newHash) {
          history.replaceState(null, "", newHash);
          window.dispatchEvent(new Event("hashchange"));
        }
      },
      { rootMargin: "-80px 0px -55% 0px", threshold: 0 }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    if (!window.location.hash) {
      history.replaceState(null, "", "#overview");
      window.dispatchEvent(new Event("hashchange"));
    }
    return () => observer.disconnect();
  }, [user]);

  // ── 액션 ──

  async function refreshAll() {
    const [m, r, s] = await Promise.all([
      fetch("/api/match-requests").then((r) => r.json()),
      fetch("/api/activity-reports").then((r) => r.json()),
      fetch("/api/schedule").then((r) => r.json()).catch(() => []),
    ]);
    if (Array.isArray(m)) setMatches(m);
    if (Array.isArray(r)) setReports(r);
    if (Array.isArray(s)) setScheduleMatches(s);
  }

  async function acceptMatch(matchId: string) {
    setActionInProgress(matchId);
    const res = await fetch(`/api/match-requests/${matchId}/accept`, { method: "PATCH" });
    if (res.ok) { await refreshAll(); setToast({ msg: "매칭을 수락했습니다.", ok: true }); }
    else setToast({ msg: "처리 중 오류가 발생했습니다.", ok: false });
    setActionInProgress(null);
  }

  async function rejectMatch(matchId: string, reason: string) {
    setRejectingId(matchId);
    const res = await fetch(`/api/match-requests/${matchId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (res.ok) {
      await refreshAll();
      setToast({ msg: "거절 처리되었습니다. 관리자가 재배정합니다.", ok: false });
    } else {
      setToast({ msg: "처리 중 오류가 발생했습니다.", ok: false });
    }
    setRejectingId(null);
    setRejectModal(null);
    setRejectReason("");
  }

  async function submitReport(e: React.SyntheticEvent) {
    e.preventDefault();
    setSubmittingReport(true);
    try {
      const imageUrls = reportForm.imageUrlsText.split("\n").map((u) => u.trim()).filter(Boolean);
      const res = await fetch("/api/activity-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId:       reportForm.matchId,
          lectureDate:   reportForm.lectureDate,
          attendeeCount: Number(reportForm.attendeeCount),
          reportText:    reportForm.reportText,
          imageUrls,
        }),
      });
      if (res.ok) {
        await refreshAll();
        setReportForm({ matchId: "", lectureDate: "", attendeeCount: "", reportText: "", imageUrlsText: "" });
        setReportOk(true);
        setTimeout(() => setReportOk(false), 3000);
        setToast({ msg: "활동 보고서가 제출되었습니다.", ok: true });
      } else {
        const err = await res.json().catch(() => ({}));
        setToast({ msg: (err as { error?: string }).error ?? "제출 중 오류가 발생했습니다.", ok: false });
      }
    } finally {
      setSubmittingReport(false);
    }
  }

  // ── 파생 상태 ──

  const pendingMatches   = useMemo(() => matches.filter((m) => m.status === "matched"), [matches]);
  const ongoingMatches   = useMemo(() => matches.filter((m) => m.status === "ongoing"), [matches]);
  const completedMatches = useMemo(() => matches.filter((m) => m.status === "completed"), [matches]);
  const submittedIds     = useMemo(() => new Set(reports.map((r) => r.match_id)), [reports]);
  const eligibleMatches  = useMemo(() => [...pendingMatches, ...ongoingMatches].filter((m) => !submittedIds.has(m.id)), [pendingMatches, ongoingMatches, submittedIds]);

  const totalAttendees = useMemo(() => reports.reduce((s, r) => s + r.attendance_count, 0), [reports]);
  const ratedReports   = useMemo(() => reports.filter((r) => r.rating_from_client !== null), [reports]);
  const avgRating      = ratedReports.length
    ? (ratedReports.reduce((s, r) => s + Number(r.rating_from_client), 0) / ratedReports.length).toFixed(1)
    : null;

  const chartData = useMemo(() => {
    const monthly: Record<string, number> = {};
    reports.forEach((r) => {
      const key = (r.lecture_date ?? "").slice(0, 7);
      if (key) monthly[key] = (monthly[key] ?? 0) + 1;
    });
    return Object.entries(monthly)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);
  }, [reports]);

  const pendingApprovalCount = useMemo(() => reports.filter((r) => r.admin_approved_at === null).length, [reports]);

  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisMonthCount = useMemo(
    () => matches.filter((m) => m.start_date.startsWith(thisMonth) && m.status !== "cancelled" && m.status !== "rejected").length,
    [matches, thisMonth]
  );

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-hwaseong-blue border-t-transparent rounded-full animate-spin" /></div>;
  }

  const lp = user.leaderProfile;
  const cert = CERT_LABELS[lp?.certLevel ?? 1];
  const maxClassesMonth = lp?.maxClassesMonth ?? 10;
  const remainingThisMonth = Math.max(0, maxClassesMonth - thisMonthCount);

  return (
    <>
      <Head><title>AI 시민 리더 대시보드 | 화성 AI 시민리더 잇다</title></Head>
      <DashboardLayout pageTitle="AI 시민 리더 대시보드">

        {/* ── 프로필 히어로 ── */}
        <div className="bg-gradient-to-br from-hwaseong-blue via-[#003fa3] to-indigo-700 rounded-3xl overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 bg-white/20 border-2 border-white/40 rounded-2xl flex items-center justify-center text-4xl font-black text-white">
                  {user.name[0]}
                </div>
                {lp?.isVerified && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 rounded-full border-2 border-white flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h2 className="text-2xl font-black text-white">{user.name}</h2>
                  {lp && (
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${cert.cls}`}>
                      {cert.short} {cert.full}
                    </span>
                  )}
                </div>
                <p className="text-blue-200 text-sm mb-3">
                  {lp?.isVerified ? "✓ 화성특례시 공식 인증 강사" : "⏳ 인증 심사 대기 중"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {lp?.specialties.slice(0, 4).map((s) => (
                    <span key={s} className="text-xs bg-white/10 text-blue-100 border border-white/20 px-2.5 py-1 rounded-full">{s}</span>
                  ))}
                  {!lp?.isVerified && (
                    <span className="text-xs bg-amber-400/20 text-amber-200 border border-amber-400/30 px-2.5 py-1 rounded-full animate-pulse">인증 신청 대기</span>
                  )}
                </div>
              </div>
              <button onClick={signOut} className="text-xs bg-white/10 border border-white/30 text-white px-4 py-2 rounded-xl hover:bg-white/20 transition-colors flex-shrink-0">
                로그아웃
              </button>
            </div>
          </div>
          <div className="bg-black/20 border-t border-white/10 grid grid-cols-4 divide-x divide-white/10">
            {[
              { label: "총 강의",    value: `${reports.length}회` },
              { label: "누적 수강생", value: `${totalAttendees}명` },
              { label: "평균 평점",  value: avgRating ? `⭐ ${avgRating}` : "—" },
              { label: "활성 매칭",  value: `${pendingMatches.length + ongoingMatches.length}건` },
            ].map((s) => (
              <div key={s.label} className="py-3 text-center">
                <p className="text-white font-bold text-lg leading-tight">{s.value}</p>
                <p className="text-blue-300 text-xs">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 신규 배정 알림 ── */}
        {pendingMatches.length > 0 && (
          <div className="rounded-3xl overflow-hidden shadow-lg border-2 border-amber-300">
            <div className="bg-amber-500 px-5 py-3 flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
              </span>
              <p className="font-black text-white text-sm flex-1">
                신규 강의 배정 {pendingMatches.length}건 — 응답을 기다리고 있습니다
              </p>
              <span className="text-white/70 text-[11px] hidden sm:block">빠른 응답을 권장합니다</span>
            </div>
            <div className="bg-amber-50 p-4 space-y-3">
              {pendingMatches.map((m) => (
                <div key={m.id} className="bg-white rounded-2xl border border-amber-100 shadow-sm p-4">
                  <p className="font-bold text-hwaseong-text text-sm mb-2.5 leading-snug">{m.title}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
                    <span className="font-medium text-gray-700">📅 {m.start_date}</span>
                    {m.address && <span>📍 {m.address}</span>}
                    <span>🏢 {m.client?.name}</span>
                    <span>👥 {m.participant_count}명{m.target_age ? ` (${m.target_age})` : ""}</span>
                    <span>🎯 {m.category}</span>
                  </div>
                  {m.notes && (
                    <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2 mb-3 line-clamp-2">📝 {m.notes}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => acceptMatch(m.id)}
                      disabled={actionInProgress === m.id}
                      className="flex-1 py-3 bg-hwaseong-blue text-white text-sm font-black rounded-xl hover:bg-blue-900 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md shadow-hwaseong-blue/20"
                    >
                      {actionInProgress === m.id
                        ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : "✅ 수락"}
                    </button>
                    <button
                      onClick={() => { setRejectModal({ matchId: m.id, title: m.title }); setRejectReason(""); }}
                      disabled={actionInProgress === m.id}
                      className="px-5 py-3 border-2 border-gray-200 text-gray-500 text-sm font-bold rounded-xl hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      거절
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            SECTION: 현황
        ══════════════════════════════════════════════════════ */}
        <section id="overview" className="scroll-mt-20 space-y-4">
          <SectionHeader icon="📊" title="현황" sub="강의 실적 · 처리 필요 항목 · 이력" />

          {/* 요약 통계 카드 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="w-9 h-9 bg-hwaseong-blue/10 text-hwaseong-blue rounded-xl flex items-center justify-center text-base mb-2.5">📅</div>
              <div className="flex items-baseline gap-1">
                <p className="text-2xl font-black text-hwaseong-text">{remainingThisMonth}</p>
                <span className="text-xs text-gray-400">/ {maxClassesMonth}회</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">이번 달 남은 강의</p>
              <div className="mt-2.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-hwaseong-blue rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.round((thisMonthCount / maxClassesMonth) * 100))}%` }}
                />
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="w-9 h-9 bg-green-100 text-green-700 rounded-xl flex items-center justify-center text-base mb-2.5">📚</div>
              <p className="text-2xl font-black text-hwaseong-text">
                {completedMatches.length}<span className="text-sm font-normal text-gray-400 ml-0.5">회</span>
              </p>
              <p className="text-xs text-gray-400 mt-0.5">누적 강의 수</p>
              <p className="text-[11px] text-gray-300 mt-1.5">{totalAttendees}명 수강</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="w-9 h-9 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center text-base mb-2.5">⭐</div>
              <p className="text-2xl font-black text-hwaseong-text">
                {avgRating ?? "—"}{avgRating && <span className="text-sm font-normal text-gray-400 ml-0.5">/ 5</span>}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">평균 평점</p>
              <p className="text-[11px] text-gray-300 mt-1.5">{ratedReports.length}건 평가됨</p>
            </div>
          </div>

          {/* 처리 필요 항목 */}
          {(pendingMatches.length > 0 || eligibleMatches.length > 0 || pendingApprovalCount > 0) && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">처리 필요 항목</h4>
              {pendingMatches.length > 0 && (
                <a href="#matches" className="w-full flex items-center gap-3 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-left hover:bg-amber-100 transition-colors">
                  <span className="w-7 h-7 bg-amber-400 rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0">{pendingMatches.length}</span>
                  <div>
                    <p className="text-xs font-bold text-amber-800">수락 대기 중인 매칭 요청</p>
                    <p className="text-[11px] text-amber-600">수락 또는 거절을 선택해 주세요</p>
                  </div>
                  <span className="ml-auto text-amber-500 text-xs">→</span>
                </a>
              )}
              {eligibleMatches.length > 0 && (
                <a href="#reports" className="w-full flex items-center gap-3 px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-left hover:bg-blue-100 transition-colors">
                  <span className="w-7 h-7 bg-hwaseong-blue rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0">{eligibleMatches.length}</span>
                  <div>
                    <p className="text-xs font-bold text-blue-800">활동 보고서 미제출 강의</p>
                    <p className="text-[11px] text-blue-600">보고서를 제출해 주세요</p>
                  </div>
                  <span className="ml-auto text-blue-500 text-xs">→</span>
                </a>
              )}
              {pendingApprovalCount > 0 && (
                <a href="#reports" className="w-full flex items-center gap-3 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-left hover:bg-gray-100 transition-colors">
                  <span className="w-7 h-7 bg-gray-400 rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0">{pendingApprovalCount}</span>
                  <div>
                    <p className="text-xs font-bold text-gray-700">관리자 승인 대기 중인 보고서</p>
                    <p className="text-[11px] text-gray-500">승인 완료 후 정산이 진행됩니다</p>
                  </div>
                  <span className="ml-auto text-gray-400 text-xs">→</span>
                </a>
              )}
            </div>
          )}

          {/* 포트폴리오 진입 */}
          <button
            onClick={() => router.push("/dashboard/leader/portfolio")}
            className="w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-hwaseong-blue/5 to-indigo-50 border border-hwaseong-blue/20 rounded-2xl hover:from-hwaseong-blue/10 hover:to-indigo-100 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-hwaseong-blue rounded-2xl flex items-center justify-center text-white text-lg group-hover:scale-105 transition-transform">🏆</div>
              <div className="text-left">
                <p className="text-sm font-bold text-hwaseong-text">내 포트폴리오 보기</p>
                <p className="text-xs text-gray-400">히트맵 · 레이더 차트 · 이력 · 활동 증명서</p>
              </div>
            </div>
            <span className="text-hwaseong-blue text-sm font-bold">→</span>
          </button>

          {/* 월별 강의 차트 */}
          {chartData.length > 0 ? (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-hwaseong-text mb-4 text-sm">최근 6개월 강의 현황</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={(v) => [`${v}회`, "강의"]} />
                  <Bar dataKey="count" name="강의 횟수" fill="#003087" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 text-gray-300">
              <p className="text-4xl mb-2">📊</p>
              <p className="text-sm">아직 강의 실적이 없습니다.</p>
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════════════════════
            SECTION: 매칭 요청
        ══════════════════════════════════════════════════════ */}
        <section id="matches" className="scroll-mt-20 space-y-4">
          <SectionHeader
            icon="🔗"
            title="매칭 요청"
            sub="수락 대기 · 진행 중 강의 일정 · 완료 이력"
            badge={pendingMatches.length || undefined}
          />

          {/* 수락 대기 */}
          {pendingMatches.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-amber-700">🔔 수락 대기</span>
                <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-full">{pendingMatches.length}</span>
              </div>
              {pendingMatches.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  actionInProgress={actionInProgress}
                  onAccept={() => acceptMatch(m.id)}
                  onReject={() => { setRejectModal({ matchId: m.id, title: m.title }); setRejectReason(""); }}
                  showActions
                />
              ))}
            </div>
          )}

          {/* 진행 중 */}
          {ongoingMatches.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-green-700">▶️ 진행 중</span>
                <span className="text-[10px] bg-green-100 text-green-700 font-bold px-1.5 py-0.5 rounded-full">{ongoingMatches.length}</span>
              </div>
              {ongoingMatches.map((m) => {
                const detail = scheduleMatches.find((s) => s.id === m.id);
                const expanded = expandedSchedule === m.id;
                return (
                  <div key={m.id} className="space-y-0">
                    <MatchCard
                      match={m}
                      actionInProgress={actionInProgress}
                      onAccept={() => acceptMatch(m.id)}
                      onReject={() => { setRejectModal({ matchId: m.id, title: m.title }); setRejectReason(""); }}
                      extra={
                        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-50 gap-2">
                          {detail ? (
                            <button
                              onClick={() => setExpandedSchedule(expanded ? null : m.id)}
                              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${
                                expanded
                                  ? "bg-hwaseong-blue/5 border-hwaseong-blue/30 text-hwaseong-blue"
                                  : "bg-gray-50 border-gray-200 text-gray-500 hover:border-hwaseong-blue/30 hover:text-hwaseong-blue"
                              }`}
                            >
                              {expanded ? "▲ 일정 접기" : "📅 일정 상세 보기"}
                            </button>
                          ) : (
                            <span className="text-xs text-green-600 bg-green-50 py-1.5 px-3 rounded-xl">✅ 수락 완료</span>
                          )}
                          {!submittedIds.has(m.id) && (
                            <button
                              onClick={() => router.push(`/dashboard/leader/report?matchId=${m.id}`)}
                              className="text-[11px] font-bold px-3 py-1.5 bg-hwaseong-blue text-white rounded-xl hover:bg-blue-900 transition-colors"
                            >
                              보고서 제출 →
                            </button>
                          )}
                          {submittedIds.has(m.id) && (
                            <span className="text-[11px] text-green-600 font-semibold bg-green-50 px-3 py-1.5 rounded-xl">✅ 보고서 제출 완료</span>
                          )}
                        </div>
                      }
                    />

                    {/* 일정 상세 패널 */}
                    {expanded && detail && (
                      <div className="bg-gray-50 border border-gray-100 border-t-0 rounded-b-2xl p-4 space-y-3 -mt-1">

                        {/* 장소 */}
                        {detail.address ? (
                          <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-gray-100">
                            <span className="text-base flex-shrink-0">📍</span>
                            <p className="text-sm text-gray-700 flex-1 font-medium">{detail.address}</p>
                            <div className="flex gap-1.5 flex-shrink-0">
                              <a href={mapUrl("kakao", detail.address)} target="_blank" rel="noopener noreferrer"
                                className="text-[11px] font-bold px-2.5 py-1.5 bg-yellow-400 text-yellow-900 rounded-lg hover:bg-yellow-500 transition-colors">
                                카카오
                              </a>
                              <a href={mapUrl("naver", detail.address)} target="_blank" rel="noopener noreferrer"
                                className="text-[11px] font-bold px-2.5 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                                네이버
                              </a>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 bg-white rounded-xl px-4 py-3 border border-gray-100">📍 장소 미정</p>
                        )}

                        {/* 수요처 담당자 */}
                        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                          <div className="bg-gray-50 px-4 py-2 flex items-center gap-2 border-b border-gray-100">
                            <span className="text-sm">🏢</span>
                            <p className="text-xs font-bold text-gray-600">수요처 담당자</p>
                            <span className="ml-auto text-[10px] text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full">연락처 공개됨</span>
                          </div>
                          <div className="px-4 py-3 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-semibold text-hwaseong-text text-sm">{detail.client_profile?.name ?? "—"}</p>
                              {detail.client_profile?.email && (
                                <p className="text-xs text-gray-400 mt-0.5 truncate">{detail.client_profile.email}</p>
                              )}
                            </div>
                            {detail.client_profile?.phone ? (
                              <a
                                href={`tel:${detail.client_profile.phone.replace(/[^0-9+]/g, "")}`}
                                className="flex items-center gap-1.5 px-4 py-2 bg-hwaseong-blue text-white text-xs font-bold rounded-xl hover:bg-blue-900 transition-colors flex-shrink-0"
                              >
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                                </svg>
                                {detail.client_profile.phone}
                              </a>
                            ) : (
                              <span className="text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-xl">연락처 미등록</span>
                            )}
                          </div>
                        </div>

                        {/* 강의 자료 */}
                        {detail.materials.length > 0 && (
                          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                            <div className="bg-gray-50 px-4 py-2 flex items-center gap-2 border-b border-gray-100">
                              <span className="text-sm">📂</span>
                              <p className="text-xs font-bold text-gray-600">강의 자료실</p>
                              <span className="ml-auto text-[10px] text-gray-400">{detail.materials.length}개</span>
                            </div>
                            <div className="divide-y divide-gray-50">
                              {detail.materials.map((mat) => (
                                <div key={mat.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/60 transition-colors">
                                  <span className="text-xl flex-shrink-0">{fileIcon(mat.file_type)}</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-hwaseong-text truncate">{mat.title}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      {mat.uploader && (
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${mat.uploader.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                                          {mat.uploader.role === "admin" ? "운영자" : "수요처"}
                                        </span>
                                      )}
                                      {mat.file_size_kb && <span className="text-[10px] text-gray-400">{fmtFileSize(mat.file_size_kb)}</span>}
                                    </div>
                                  </div>
                                  <a href={mat.file_url} target="_blank" rel="noopener noreferrer" download
                                    className="flex-shrink-0 text-[11px] font-bold px-3 py-1.5 bg-hwaseong-blue/10 text-hwaseong-blue rounded-xl hover:bg-hwaseong-blue hover:text-white transition-colors">
                                    ↓ 다운로드
                                  </a>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 요청사항 */}
                        {detail.notes && (
                          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                            <p className="text-[10px] font-bold text-amber-600 mb-1">📝 수요처 요청사항</p>
                            <p className="text-xs text-amber-800 leading-relaxed">{detail.notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 완료됨 */}
          {completedMatches.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-500">✅ 완료됨</span>
                <span className="text-[10px] bg-gray-100 text-gray-500 font-bold px-1.5 py-0.5 rounded-full">{completedMatches.length}</span>
              </div>
              {completedMatches.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  actionInProgress={actionInProgress}
                  onAccept={() => acceptMatch(m.id)}
                  onReject={() => { setRejectModal({ matchId: m.id, title: m.title }); setRejectReason(""); }}
                  muted
                />
              ))}
            </div>
          )}

          {matches.length === 0 && (
            <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 text-gray-400">
              <p className="text-4xl mb-3">📭</p>
              <p className="text-sm">아직 배정된 매칭 요청이 없습니다.</p>
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════════════════════
            SECTION: 활동 보고
        ══════════════════════════════════════════════════════ */}
        <section id="reports" className="scroll-mt-20 space-y-4">
          <SectionHeader
            icon="📄"
            title="활동 보고"
            sub="보고서 제출 · 승인 현황"
            badge={pendingApprovalCount || undefined}
          />

          {/* 보고서 제출 폼 */}
          {eligibleMatches.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-hwaseong-text mb-4 text-sm">활동 보고서 제출</h3>
              <form onSubmit={submitReport} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">매칭 선택 <span className="text-red-400">*</span></label>
                  <select
                    value={reportForm.matchId}
                    onChange={(e) => setReportForm((p) => ({ ...p, matchId: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30 bg-white"
                    required
                  >
                    <option value="">-- 매칭 선택 --</option>
                    {eligibleMatches.map((m) => (
                      <option key={m.id} value={m.id}>{m.title}{m.address ? ` (${m.address})` : ""}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">강의 날짜 <span className="text-red-400">*</span></label>
                    <input type="date" value={reportForm.lectureDate}
                      onChange={(e) => setReportForm((p) => ({ ...p, lectureDate: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30"
                      required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">실제 참석자 수 <span className="text-red-400">*</span></label>
                    <input type="number" min="1" value={reportForm.attendeeCount}
                      onChange={(e) => setReportForm((p) => ({ ...p, attendeeCount: e.target.value }))}
                      placeholder="0"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30"
                      required />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">강의 일지</label>
                  <textarea rows={3} value={reportForm.reportText}
                    onChange={(e) => setReportForm((p) => ({ ...p, reportText: e.target.value }))}
                    placeholder="강의 내용, 수강생 반응, 특이사항 등을 작성해 주세요."
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30 resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">현장 사진 URL (줄바꿈으로 구분)</label>
                  <textarea rows={2} value={reportForm.imageUrlsText}
                    onChange={(e) => setReportForm((p) => ({ ...p, imageUrlsText: e.target.value }))}
                    placeholder={"https://storage.example.com/photo1.jpg\nhttps://storage.example.com/photo2.jpg"}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30 resize-none font-mono" />
                  <p className="text-[11px] text-gray-400 mt-1">Supabase Storage에 업로드 후 URL을 붙여넣어 주세요.</p>
                </div>
                <button type="submit" disabled={submittingReport}
                  className="w-full py-3 bg-hwaseong-blue text-white text-sm font-bold rounded-xl hover:bg-blue-900 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {submittingReport ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "📤"}
                  {submittingReport ? "제출 중..." : reportOk ? "✅ 제출 완료!" : "보고서 제출"}
                </button>
              </form>
            </div>
          )}

          {/* 제출된 보고서 목록 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-hwaseong-text text-sm">제출된 활동 보고서 ({reports.length}건)</h3>
              {pendingApprovalCount > 0 && (
                <span className="text-[11px] bg-amber-100 text-amber-700 font-bold px-2 py-1 rounded-full">
                  승인 대기 {pendingApprovalCount}건
                </span>
              )}
            </div>

            {reports.length === 0 && (
              <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 text-gray-400">
                <p className="text-4xl mb-3">📄</p>
                <p className="text-sm">아직 제출된 보고서가 없습니다.</p>
              </div>
            )}

            {reports.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-hwaseong-text text-sm truncate">{r.match?.title ?? "—"}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{r.match?.address} · 강의일 {fmtDate(r.lecture_date)}</p>
                  </div>
                  <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-1 rounded-full ${
                    r.admin_approved_at ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {r.admin_approved_at ? "✓ 승인완료" : "⏳ 승인대기"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-3">
                  <span className="bg-gray-50 px-2 py-1 rounded-lg">👥 참석 {r.attendance_count}명</span>
                  <span className="bg-gray-50 px-2 py-1 rounded-lg">📤 제출 {fmtDate(r.submitted_at)}</span>
                  {r.admin_approved_at && (
                    <span className="bg-green-50 text-green-700 px-2 py-1 rounded-lg">✅ 승인 {fmtDate(r.admin_approved_at)}</span>
                  )}
                </div>
                {r.report_text && <p className="text-xs text-gray-600 leading-relaxed mb-3 line-clamp-2">{r.report_text}</p>}
                <div className="flex items-center justify-between">
                  <StarRating value={r.rating_from_client} />
                  {r.image_urls && r.image_urls.length > 0 && (
                    <span className="text-[11px] text-gray-400">📷 현장사진 {r.image_urls.length}장</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

      </DashboardLayout>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-white text-sm font-semibold max-w-sm ${
          toast.ok ? "bg-green-600" : "bg-red-500"
        }`}>
          <span>{toast.ok ? "✅" : "❌"}</span>
          <span className="flex-1">{toast.msg}</span>
          <button onClick={() => setToast(null)} className="opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* 거절 사유 입력 모달 */}
      {rejectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={(e) => { if (e.target === e.currentTarget) setRejectModal(null); }}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <p className="text-xs font-semibold text-red-500 mb-1.5">매칭 거절</p>
              <h3 className="font-bold text-hwaseong-text text-sm leading-snug line-clamp-2">{rejectModal.title}</h3>
            </div>
            <div className="px-6 py-4 space-y-3">
              <p className="text-sm text-gray-500">거절 처리 후 관리자가 다른 강사로 재배정합니다.</p>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  거절 사유 <span className="font-normal text-gray-400">(선택)</span>
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="일정 충돌, 전문 분야 불일치 등 사유를 입력해 주세요."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-200 resize-none"
                  autoFocus
                />
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-2">
              <button
                onClick={() => setRejectModal(null)}
                disabled={rejectingId !== null}
                className="flex-1 py-3 border-2 border-gray-200 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={() => rejectMatch(rejectModal.matchId, rejectReason)}
                disabled={rejectingId !== null}
                className="flex-1 py-3 bg-red-500 text-white text-sm font-bold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {rejectingId
                  ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />처리 중...</>
                  : "거절 확인"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── 매칭 카드 컴포넌트 ────────────────────────────────────────────────────

function MatchCard({
  match: m,
  actionInProgress,
  onAccept,
  onReject,
  showActions = false,
  muted = false,
  extra,
}: {
  match: MatchRequest;
  actionInProgress: string | null;
  onAccept: () => void;
  onReject: () => void;
  showActions?: boolean;
  muted?: boolean;
  extra?: React.ReactNode;
}) {
  const busy = actionInProgress === m.id;
  return (
    <div className={`rounded-2xl p-4 shadow-sm border ${muted ? "bg-gray-50 border-gray-100 opacity-70" : "bg-white border-gray-100"}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <p className="font-semibold text-hwaseong-text text-sm truncate">{m.title}</p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{m.client?.name}</p>
        </div>
        <StatusBadge status={m.status} />
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {[
          m.category && `🎯 ${m.category}`,
          m.address && `📍 ${m.address}`,
          `📅 ${m.start_date}`,
          `👥 ${m.participant_count}명${m.target_age ? ` (${m.target_age})` : ""}`,
          m.frequency && FREQ_LABELS[m.frequency] && `🔄 ${FREQ_LABELS[m.frequency]}`,
          m.location_type && LOC_LABELS[m.location_type] && `📡 ${LOC_LABELS[m.location_type]}`,
        ].filter(Boolean).map((tag) => (
          <span key={String(tag)} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg">{tag}</span>
        ))}
      </div>
      {m.notes && <p className="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2 mb-2 line-clamp-2">📝 {m.notes}</p>}
      {showActions && (
        <div className="flex gap-2">
          <button onClick={onAccept} disabled={busy}
            className="flex-1 py-2.5 bg-hwaseong-blue text-white text-xs font-bold rounded-xl hover:bg-blue-900 transition-colors disabled:opacity-50">
            {busy ? "처리 중..." : "✅ 수락"}
          </button>
          <button onClick={onReject} disabled={busy}
            className="flex-1 py-2.5 bg-white border-2 border-red-300 text-red-500 text-xs font-bold rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50">
            {busy ? "..." : "✕ 거절"}
          </button>
        </div>
      )}
      {extra}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:   { label: "대기 중",  cls: "bg-amber-100 text-amber-700" },
    matched:   { label: "수락 대기", cls: "bg-blue-100 text-blue-700" },
    ongoing:   { label: "진행 중",  cls: "bg-green-100 text-green-700" },
    completed: { label: "완료",     cls: "bg-gray-100 text-gray-600" },
    cancelled: { label: "취소",     cls: "bg-red-50 text-red-500" },
    rejected:  { label: "거절됨",   cls: "bg-orange-100 text-orange-700" },
  };
  const s = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-500" };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${s.cls}`}>{s.label}</span>;
}
