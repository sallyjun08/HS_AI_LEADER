import Head from "next/head";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/lib/auth-context";
import DashboardLayout from "@/components/DashboardLayout";
import LectureCalendar, { CalendarMatch } from "@/components/LectureCalendar";

// ─── Types ────────────────────────────────────────────────────────────────────

type LectureTimeSlot = {
  date?: string;
  day?: string;
  startTime?: string;
  start?: string;
  endTime?: string;
  end?: string;
};

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
  contact_phone: string | null;
  client_profile: { name: string; email: string; phone: string | null } | null;
  materials: ScheduleMaterial[];
};

type LectureType = "oneday" | "intensive" | "longterm";

type MatchRequest = {
  id: string;
  title: string;
  category: string;
  lecture_type: LectureType | null;
  target_audience: string[] | null;
  participant_count: number;
  session_count: number | null;
  lecture_hours: number | null;
  start_date: string;
  end_date: string | null;
  lecture_times: LectureTimeSlot[] | null;
  address: string | null;
  notes: string | null;
  status: string;
  matched_at: string | null;
  client: { name: string } | null;
};

type FilterType     = "all" | "active" | "awaiting_client" | "awaiting_admin" | "completed";
type TypeFilterType = "all" | LectureType;

type Report = {
  id: string;
  match_id: string;
  session_index: number;
  lecture_date: string;
  lecture_dates: string[];
  attendance_count: number;
  report_text: string | null;
  image_urls: string[];
  rating_from_client: number | null;
  admin_approved_at: string | null;
  submitted_at: string;
  client_rejected_at: string | null;
  client_rejection_reason: string | null;
  client_approved_at: string | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_KR: Record<string, string> = {
  mon: "월", tue: "화", wed: "수", thu: "목", fri: "금", sat: "토", sun: "일",
};

const STAGE_OPTIONS: { value: FilterType; label: string; icon: string; bg: string; border: string; text: string }[] = [
  { value: "active",          label: "강의 진행 중",    icon: "▶️", bg: "bg-green-50",  border: "border-green-300",  text: "text-green-700"  },
  { value: "awaiting_client", label: "수요처 평가 대기", icon: "🕐", bg: "bg-sky-50",    border: "border-sky-300",    text: "text-sky-700"    },
  { value: "awaiting_admin",  label: "운영자 승인 대기", icon: "⏳", bg: "bg-amber-50",  border: "border-amber-300",  text: "text-amber-700"  },
  { value: "completed",       label: "완료",            icon: "✅", bg: "bg-teal-50",   border: "border-teal-300",   text: "text-teal-700"   },
];

const TYPE_OPTIONS: { value: TypeFilterType; label: string }[] = [
  { value: "all",       label: "전체" },
  { value: "oneday",    label: "원데이형" },
  { value: "intensive", label: "집중코스형" },
  { value: "longterm",  label: "장기정기형" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function formatDateKorean(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${y}년 ${Number(m)}월 ${Number(d)}일`;
}

function addHoursToTime(time: string, hours: number): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + Math.round(hours * 60);
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function formatHours(h: number): string {
  const w = Math.floor(h);
  const mins = Math.round((h - w) * 60);
  if (mins === 0) return `${w}시간`;
  if (w === 0) return `${mins}분`;
  return `${w}시간 ${mins}분`;
}

function formatSchedule(m: MatchRequest): string {
  const slots = m.lecture_times ?? [];

  if (m.lecture_type === "oneday") {
    const datePart = formatDateKorean(m.start_date);
    const first = slots[0];
    const startTime = first?.startTime ?? first?.start ?? "";
    const hours = m.lecture_hours ?? 2;
    const endTime = first?.endTime ?? first?.end ?? (startTime ? addHoursToTime(startTime, hours) : "");
    if (startTime && endTime) {
      return `${datePart}  ${startTime} ~ ${endTime}  (총 ${formatHours(hours)})`;
    }
    return datePart;
  }

  // intensive / longterm
  const startPart = formatDateKorean(m.start_date);
  const endPart   = m.end_date ? formatDateKorean(m.end_date) : "";
  const sessionCount = m.session_count ?? 1;

  const uniqueDays = [...new Set(slots.map((s) => s.day).filter(Boolean))]
    .map((d) => DAY_KR[d!] ?? d)
    .join("·");
  const firstTime = slots[0]?.startTime ?? slots[0]?.start ?? "";

  const rangePart   = endPart ? `${startPart} ~ ${endPart}` : startPart;
  const dayTimePart = uniqueDays
    ? firstTime ? `매주 ${uniqueDays}요일 ${firstTime}` : `매주 ${uniqueDays}요일`
    : "";

  return [rangePart, dayTimePart, `총 ${sessionCount}회`].filter(Boolean).join("  |  ");
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LeaderLecturesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [matches, setMatches]               = useState<MatchRequest[]>([]);
  const [scheduleMatches, setScheduleMatches] = useState<ScheduleMatch[]>([]);
  const [reportsByMatch, setReportsByMatch]   = useState<Map<string, Report[]>>(new Map());
  const [expandedSchedule, setExpandedSchedule] = useState<string | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [expandedReport, setExpandedReport]     = useState<string | null>(null);
  const [toast, setToast]                   = useState<{ msg: string; ok: boolean } | null>(null);
  const [filter, setFilter]         = useState<FilterType>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilterType>("all");

  useEffect(() => {
    if (!loading && (!user || user.role !== "leader")) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  async function fetchAll() {
    const [m, r, s] = await Promise.all([
      fetch("/api/match-requests").then((res) => res.json()),
      fetch("/api/activity-reports").then((res) => res.json()),
      fetch("/api/schedule").then((res) => res.json()).catch(() => []),
    ]);
    if (Array.isArray(m)) setMatches(m);
    if (Array.isArray(r)) {
      const map = new Map<string, Report[]>();
      (r as Report[]).forEach((x) => {
        if (!map.has(x.match_id)) map.set(x.match_id, []);
        map.get(x.match_id)!.push(x);
      });
      setReportsByMatch(map);
    }
    if (Array.isArray(s)) setScheduleMatches(s);
  }

  useEffect(() => {
    if (user) fetchAll();
  }, [user]);

  // status 필드를 직접 신뢰: completed = 운영자 최종 승인 완료
  const ongoingMatches   = useMemo(() => matches.filter((m) => m.status === "matched" || m.status === "ongoing"), [matches]);
  const completedMatches = useMemo(() => matches.filter((m) => m.status === "completed"), [matches]);

  const byType = (list: MatchRequest[]) =>
    typeFilter === "all" ? list : list.filter((m) => m.lecture_type === typeFilter);

  // 각 진행중 매칭의 보고서 단계 분류 — 마지막 회차 기준으로 판단
  const matchStages = useMemo(() => {
    const awaitingClientIds = new Set<string>();
    const awaitingAdminIds  = new Set<string>();
    for (const m of ongoingMatches) {
      const reports     = reportsByMatch.get(m.id) ?? [];
      const isRejected  = reports.some((r) => r.client_rejected_at);
      const nonRejected = reports.filter((r) => !r.client_rejected_at)
        .sort((a, b) => (a.session_index ?? 0) - (b.session_index ?? 0));
      const submitted   = nonRejected.length;
      const total       = m.session_count ?? 1;
      const isIntensive = m.lecture_type === "intensive";
      const allDone     = !isRejected && (isIntensive ? submitted >= 1 : submitted >= total);
      if (!allDone) continue;
      const lastReport  = nonRejected[nonRejected.length - 1];
      if (!lastReport?.rating_from_client) awaitingClientIds.add(m.id);
      else awaitingAdminIds.add(m.id);  // 마지막 회차 평가 완료 → 운영자 최종 승인 대기
    }
    return { awaitingClientIds, awaitingAdminIds };
  }, [ongoingMatches, reportsByMatch]);

  const stageCounts: Record<FilterType, number> = {
    all:             ongoingMatches.length + completedMatches.length,
    active:          ongoingMatches.length - matchStages.awaitingClientIds.size - matchStages.awaitingAdminIds.size,
    awaiting_client: matchStages.awaitingClientIds.size,
    awaiting_admin:  matchStages.awaitingAdminIds.size,
    completed:       completedMatches.length,
  };

  const filteredOngoing = useMemo(() => {
    let list = ongoingMatches;
    if (filter === "active")          list = list.filter((m) => !matchStages.awaitingClientIds.has(m.id) && !matchStages.awaitingAdminIds.has(m.id));
    else if (filter === "awaiting_client") list = list.filter((m) => matchStages.awaitingClientIds.has(m.id));
    else if (filter === "awaiting_admin")  list = list.filter((m) => matchStages.awaitingAdminIds.has(m.id));
    else if (filter === "completed")  list = [];
    return byType(list);
  }, [filter, typeFilter, ongoingMatches, matchStages]);

  const filteredCompleted = useMemo(() => {
    const list = (filter === "all" || filter === "completed") ? completedMatches : [];
    return byType(list);
  }, [filter, typeFilter, completedMatches]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-hwaseong-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Head><title>내 강의 | 화성 AI 시민리더 잇다</title></Head>
      <DashboardLayout pageTitle="내 강의">

        {/* 단계별 필터 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          {/* 전체 */}
          <button
            onClick={() => setFilter("all")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${
              filter === "all"
                ? "bg-gray-100 border-gray-300 text-gray-700"
                : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
            }`}
          >
            <span>📋</span>
            <span>전체</span>
            <span className={`font-black ${filter === "all" ? "text-gray-700" : "text-gray-400"}`}>
              {stageCounts.all}
            </span>
          </button>

          {/* 진행 파이프라인 */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 mb-2 tracking-wide uppercase">진행 단계</p>
            <div className="flex items-center gap-1 flex-wrap">
              {STAGE_OPTIONS.map((f, i) => {
                const isActive = filter === f.value;
                return (
                  <div key={f.value} className="flex items-center gap-1">
                    {i > 0 && <span className="text-gray-300 text-xs flex-shrink-0">→</span>}
                    <button
                      onClick={() => setFilter(f.value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${
                        isActive
                          ? `${f.bg} ${f.border} ${f.text}`
                          : "bg-white border-gray-100 text-gray-500 hover:border-gray-200"
                      }`}
                    >
                      <span>{f.icon}</span>
                      <span>{f.label}</span>
                      <span className={`font-black ${isActive ? f.text : "text-gray-400"}`}>
                        {stageCounts[f.value]}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 강의 유형 필터 */}
        <div className="flex gap-2 flex-wrap">
          {TYPE_OPTIONS.map((opt) => {
            const pool = filter === "completed" ? completedMatches : filter !== "all" ? filteredOngoing : [...ongoingMatches, ...completedMatches];
            const count = opt.value === "all" ? pool.length : pool.filter((m) => m.lecture_type === opt.value).length;
            const active = typeFilter === opt.value;
            const typeColor =
              opt.value === "oneday"    ? (active ? "bg-blue-500 border-blue-500 text-white"             : "bg-white border-blue-200 text-blue-600 hover:bg-blue-50") :
              opt.value === "intensive" ? (active ? "bg-yellow-500 border-yellow-500 text-white"          : "bg-white border-yellow-200 text-yellow-700 hover:bg-yellow-50") :
              opt.value === "longterm"  ? (active ? "bg-green-600 border-green-600 text-white"            : "bg-white border-green-200 text-green-700 hover:bg-green-50") :
                                          (active ? "bg-hwaseong-blue text-white border-hwaseong-blue shadow-sm" : "bg-white text-gray-500 border-gray-200 hover:border-hwaseong-blue/40 hover:text-hwaseong-blue");
            return (
              <button
                key={opt.value}
                onClick={() => setTypeFilter(opt.value)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${typeColor}`}
              >
                {opt.label}
                {count > 0 && (
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                    active ? "bg-white/20 text-current" : "bg-gray-100 text-gray-500"
                  }`}>{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* 진행 중 */}
        {filteredOngoing.length > 0 && (
          <section className="space-y-3">
            <SectionHeader label="진행 중" icon="▶️" colorKey="green" count={filteredOngoing.length} />
            {filteredOngoing.map((m) => {
              const detail          = scheduleMatches.find((s) => s.id === m.id);
              const expanded        = expandedSchedule === m.id;
              const isLongterm      = m.lecture_type === "longterm";
              const isIntensive     = m.lecture_type === "intensive";
              const isMultiSession  = isLongterm && (m.session_count ?? 1) > 1;
              const reports            = reportsByMatch.get(m.id) ?? [];
              const rejectedReport     = reports.find((r) => r.client_rejected_at);
              const isRejected         = !!rejectedReport;
              const nonRejected        = reports.filter((r) => !r.client_rejected_at);
              const submitted          = nonRejected.length;
              const totalSession       = m.session_count ?? 1;
              const allDone            = !isRejected && (isIntensive ? submitted >= 1 : submitted >= totalSession);
              const awaitingClient     = allDone && nonRejected.some((r) => !r.rating_from_client && !r.client_approved_at);
              const awaitingAdmin      = allDone && !awaitingClient && nonRejected.some((r) => !r.admin_approved_at);
              const nextSession        = submitted + 1;

              return (
                <div key={m.id}>
                  <MatchCard
                    match={m}
                    extra={
                      <div className="mt-3 pt-2.5 border-t border-gray-100 space-y-2">

                        {/* 반려 알림 */}
                        {isRejected && rejectedReport && (
                          <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-red-500 text-sm">↩</span>
                              <p className="text-xs font-bold text-red-700">수요처가 보고서를 반려했습니다</p>
                            </div>
                            <p className="text-xs text-red-600 leading-relaxed bg-white border border-red-100 rounded-lg px-2.5 py-2">
                              "{rejectedReport.client_rejection_reason}"
                            </p>
                            <button
                              onClick={() => router.push(`/dashboard/leader/report?matchId=${m.id}&resubmit=${rejectedReport.id}`)}
                              className="w-full py-2 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition-colors"
                            >
                              📝 보고서 재작성 →
                            </button>
                          </div>
                        )}

                        {/* 진행 프로그레스 바 */}
                        {isIntensive ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${allDone ? "bg-green-500" : "bg-amber-400"}`}
                                style={{ width: allDone ? "100%" : "0%" }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-gray-500 flex-shrink-0">
                              {allDone ? "보고서 완료" : `총 ${totalSession}일 과정`}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-hwaseong-blue rounded-full transition-all"
                                style={{ width: `${Math.min(100, Math.round((submitted / totalSession) * 100))}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-gray-500 flex-shrink-0">
                              {submitted}/{totalSession}회 완료
                            </span>
                          </div>
                        )}

                        {/* 다회차 강의(집중코스형/장기정기형) — 회차별 보고서 목록 */}
                        {isMultiSession && (() => {
                          const sessionsOpen = expandedSessions.has(m.id);
                          const toggleSessions = () =>
                            setExpandedSessions((prev) => {
                              const next = new Set(prev);
                              next.has(m.id) ? next.delete(m.id) : next.add(m.id);
                              return next;
                            });
                          return (
                            <div>
                              <button
                                onClick={toggleSessions}
                                className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors w-full justify-between ${
                                  sessionsOpen
                                    ? "bg-green-50 border-green-200 text-green-700"
                                    : "bg-gray-50 border-gray-200 text-gray-500 hover:border-green-200 hover:text-green-700"
                                }`}
                              >
                                <span>📋 회차별 보고서 현황</span>
                                <span className="text-[10px]">{sessionsOpen ? "▲ 접기" : "▼ 펼치기"}</span>
                              </button>

                              {sessionsOpen && (
                                <div className="space-y-1.5 pt-2">
                                  {Array.from({ length: totalSession }, (_, i) => {
                              const report = reports.find((r) => r.session_index === i);
                              const isDone    = !!report;
                              const isNext    = !isDone && i === submitted;
                              const isLocked  = !isDone && i > submitted;
                              const clientApproved = isDone && !!(report!.client_approved_at || report!.rating_from_client);
                              return (
                                <div key={i} className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl ${
                                  isDone && clientApproved ? "bg-green-50 border border-green-100" :
                                  isDone                  ? "bg-sky-50 border border-sky-100" :
                                  isNext                  ? "bg-blue-50 border border-blue-100" :
                                                            "bg-gray-50 border border-gray-100"
                                }`}>
                                  <span className={`text-xs font-bold flex-shrink-0 ${
                                    isDone && clientApproved ? "text-green-700" :
                                    isDone                  ? "text-sky-700" :
                                    isNext                  ? "text-hwaseong-blue" : "text-gray-400"
                                  }`}>
                                    {i + 1}회차
                                  </span>
                                  {isDone ? (
                                    (() => {
                                      const clientApproved = !!(report.client_approved_at || report.rating_from_client);
                                      return clientApproved ? (
                                        <span className="text-[10px] text-green-600 flex items-center gap-1">
                                          ✅ 승인됨
                                          {report.lecture_date && (
                                            <span className="text-gray-400">· {report.lecture_date}</span>
                                          )}
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-sky-600 flex items-center gap-1 font-semibold">
                                          ⏳ 승인 대기중
                                          {report.lecture_date && (
                                            <span className="text-gray-400 font-normal">· {report.lecture_date}</span>
                                          )}
                                        </span>
                                      );
                                    })()
                                  ) : isNext ? (
                                    <button
                                      onClick={() => router.push(`/dashboard/leader/report?matchId=${m.id}&sessionIndex=${i}`)}
                                      className="text-[11px] font-bold px-2.5 py-1 bg-hwaseong-blue text-white rounded-lg hover:bg-blue-900 transition-colors"
                                    >
                                      보고서 작성 →
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-gray-400">⏳ 이전 회차 제출 후 작성 가능</span>
                                  )}
                                </div>
                              );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* 일정 상세 / 보고서 버튼 행 */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
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

                          {/* 원데이형 */}
                          {!isMultiSession && !isIntensive && (
                            allDone ? (
                              awaitingClient ? (
                                <span className="text-[11px] text-sky-600 font-semibold bg-sky-50 border border-sky-200 px-3 py-1.5 rounded-xl">
                                  🕐 수요처 평가 대기
                                </span>
                              ) : awaitingAdmin ? (
                                <span className="text-[11px] text-amber-600 font-semibold bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
                                  ⏳ 운영자 승인 대기
                                </span>
                              ) : (
                                <span className="text-[11px] text-green-600 font-semibold bg-green-50 px-3 py-1.5 rounded-xl">
                                  ✅ 보고서 제출 완료
                                </span>
                              )
                            ) : (
                              <button
                                onClick={() => router.push(`/dashboard/leader/report?matchId=${m.id}&sessionIndex=0`)}
                                className="text-[11px] font-bold px-3 py-1.5 bg-hwaseong-blue text-white rounded-xl hover:bg-blue-900 transition-colors"
                              >
                                보고서 제출 →
                              </button>
                            )
                          )}

                          {/* 집중코스형: 전체 날짜 한 번에 제출 */}
                          {isIntensive && (
                            allDone ? (
                              awaitingClient ? (
                                <span className="text-[11px] text-sky-600 font-semibold bg-sky-50 border border-sky-200 px-3 py-1.5 rounded-xl">
                                  🕐 수요처 평가 대기
                                </span>
                              ) : awaitingAdmin ? (
                                <span className="text-[11px] text-amber-600 font-semibold bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
                                  ⏳ 운영자 승인 대기
                                </span>
                              ) : (
                                <span className="text-[11px] text-green-600 font-semibold bg-green-50 px-3 py-1.5 rounded-xl">
                                  ✅ 보고서 제출 완료
                                </span>
                              )
                            ) : (
                              <button
                                onClick={() => router.push(`/dashboard/leader/report?matchId=${m.id}`)}
                                className="text-[11px] font-bold px-3 py-1.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors"
                              >
                                📚 전체 보고서 제출 →
                              </button>
                            )
                          )}

                          {/* 장기정기형 전체 완료 */}
                          {isMultiSession && allDone && (
                            awaitingClient ? (
                              <span className="text-[11px] text-sky-600 font-semibold bg-sky-50 border border-sky-200 px-3 py-1.5 rounded-xl">
                                🕐 수요처 평가 대기
                              </span>
                            ) : awaitingAdmin ? (
                              <span className="text-[11px] text-amber-600 font-semibold bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
                                ⏳ 운영자 승인 대기
                              </span>
                            ) : (
                              <span className="text-[11px] text-green-600 font-semibold bg-green-50 px-3 py-1.5 rounded-xl">
                                ✅ 전체 {totalSession}회 완료
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    }
                  />
                  {expanded && (() => {
                    const calMatches: CalendarMatch[] = ongoingMatches.map((x) => ({
                      id: x.id,
                      title: x.title,
                      start_date: x.start_date,
                      end_date: x.end_date,
                      status: x.status,
                      lecture_type: x.lecture_type,
                      session_count: x.session_count,
                      lecture_times: x.lecture_times,
                    }));
                    return (
                      <div className="mt-2 space-y-2">
                        <LectureCalendar matches={calMatches} highlightId={m.id} />
                        {detail && <ScheduleDetailPanel detail={detail} />}
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </section>
        )}

        {/* 완료됨 */}
        {filteredCompleted.length > 0 && (
          <section className="space-y-3">
            <SectionHeader label="완료됨" icon="✅" colorKey="gray" count={filteredCompleted.length} />
            {filteredCompleted.map((m) => {
              const reports  = reportsByMatch.get(m.id) ?? [];
              const isOpen   = expandedReport === m.id;
              return (
                <div key={m.id}>
                  <MatchCard
                    match={m}
                    muted
                    extra={
                      <div className="mt-3 pt-2.5 border-t border-gray-100">
                        <button
                          onClick={() => setExpandedReport(isOpen ? null : m.id)}
                          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border w-full justify-between transition-colors ${
                            isOpen
                              ? "bg-gray-100 border-gray-200 text-gray-700"
                              : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"
                          }`}
                        >
                          <span>📄 활동 보고서 {reports.length > 1 ? `(${reports.length}건)` : ""}</span>
                          <span className="text-[10px]">{isOpen ? "▲ 접기" : "▼ 보기"}</span>
                        </button>
                      </div>
                    }
                  />
                  {isOpen && reports.length > 0 && (
                    <div className="mt-1 space-y-2">
                      {[...reports]
                        .sort((a, b) => (a.session_index ?? 0) - (b.session_index ?? 0))
                        .map((r) => (
                        <ReportDetailPanel
                          key={r.id}
                          report={r}
                          matchType={m.lecture_type}
                          totalSessions={reports.length > 1 ? m.session_count : null}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {filteredOngoing.length === 0 && filteredCompleted.length === 0 && (
          <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 text-gray-400">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-sm">
              {filter === "all"
                ? "진행 중이거나 완료된 강의가 없습니다."
                : `'${STAGE_OPTIONS.find((f) => f.value === filter)?.label ?? filter}' 강의가 없습니다.`}
            </p>
          </div>
        )}

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
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({
  label, icon, colorKey, count,
}: {
  label: string;
  icon: string;
  colorKey: "amber" | "green" | "gray";
  count: number;
}) {
  const c = {
    amber: { text: "text-amber-700", badge: "bg-amber-100 text-amber-700" },
    green: { text: "text-green-700", badge: "bg-green-100 text-green-700" },
    gray:  { text: "text-gray-500",  badge: "bg-gray-100 text-gray-500"   },
  }[colorKey];
  return (
    <div className="flex items-center gap-2">
      <span className={`text-sm font-bold ${c.text}`}>{icon} {label}</span>
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${c.badge}`}>{count}</span>
    </div>
  );
}

function LectureTypeBadge({ type }: { type: LectureType | null }) {
  if (!type) return null;
  const map: Record<LectureType, { label: string; cls: string }> = {
    oneday:    { label: "원데이형",   cls: "bg-blue-100 text-blue-700" },
    intensive: { label: "집중코스형", cls: "bg-yellow-100 text-yellow-700" },
    longterm:  { label: "장기정기형", cls: "bg-green-100 text-green-700" },
  };
  const s = map[type];
  return (
    <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${s.cls}`}>
      {s.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:   { label: "대기 중",   cls: "bg-amber-100 text-amber-700" },
    matched:   { label: "수락 대기", cls: "bg-blue-100 text-blue-700" },
    ongoing:   { label: "진행 중",   cls: "bg-green-100 text-green-700" },
    completed: { label: "완료",      cls: "bg-gray-100 text-gray-600" },
    cancelled: { label: "취소",      cls: "bg-red-50 text-red-500" },
    rejected:  { label: "거절됨",    cls: "bg-orange-100 text-orange-700" },
  };
  const s = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-500" };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${s.cls}`}>
      {s.label}
    </span>
  );
}

function MatchCard({
  match: m,
  muted = false,
  extra,
}: {
  match: MatchRequest;
  muted?: boolean;
  extra?: React.ReactNode;
}) {
  const schedule = formatSchedule(m);

  const typeBarColor =
    m.lecture_type === "oneday"    ? "bg-blue-400" :
    m.lecture_type === "intensive" ? "bg-yellow-400" :
    m.lecture_type === "longterm"  ? "bg-green-400" : "bg-gray-200";

  const scheduleBg =
    m.lecture_type === "oneday"    ? "bg-blue-50" :
    m.lecture_type === "intensive" ? "bg-yellow-50" :
    m.lecture_type === "longterm"  ? "bg-green-50" : "bg-gray-50";

  return (
    <div className={`rounded-2xl overflow-hidden shadow-sm border ${muted ? "bg-gray-50 border-gray-100 opacity-70" : "bg-white border-gray-100"}`}>
      {/* 강의 유형 컬러 바 */}
      {m.lecture_type && <div className={`h-1 w-full ${typeBarColor}`} />}

      <div className="p-4">
        {/* 헤더 */}
        <div className="mb-2.5">
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <LectureTypeBadge type={m.lecture_type} />
            <StatusBadge status={m.status} />
          </div>
          <p className="font-bold text-hwaseong-text text-sm leading-snug">{m.title}</p>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{m.client?.name}</p>
        </div>

        {/* 일정 표시 */}
        {schedule && (
          <div className={`flex items-start gap-2 px-3 py-2.5 rounded-xl mb-3 ${scheduleBg}`}>
            <span className="text-xs mt-0.5 flex-shrink-0">📅</span>
            <p className="text-xs font-semibold text-gray-700 leading-relaxed break-keep">{schedule}</p>
          </div>
        )}

        {/* 정보 태그 */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {[
            m.category                                              && `🎯 ${m.category}`,
            m.address                                              && `📍 ${m.address}`,
            `👥 ${m.participant_count}명`,
            m.session_count && m.session_count > 1                 && `🔄 총 ${m.session_count}회`,
            ...(m.target_audience ?? []).slice(0, 2).map((t) => `👤 ${t}`),
          ].filter(Boolean).map((tag) => (
            <span key={String(tag)} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg">{tag}</span>
          ))}
        </div>

        {m.notes && (
          <p className="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2 mb-2 line-clamp-2">
            📝 {m.notes}
          </p>
        )}

        {extra}
      </div>
    </div>
  );
}

function ScheduleDetailPanel({ detail }: { detail: ScheduleMatch }) {
  return (
    <div className="bg-gray-50 border border-gray-100 border-t-0 rounded-b-2xl p-4 space-y-3 -mt-1">
      {detail.address ? (
        <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-gray-100">
          <span className="text-base flex-shrink-0">📍</span>
          <p className="text-sm text-gray-700 flex-1 font-medium">{detail.address}</p>
          <div className="flex gap-1.5 flex-shrink-0">
            <a
              href={mapUrl("kakao", detail.address)}
              target="_blank" rel="noopener noreferrer"
              className="text-[11px] font-bold px-2.5 py-1.5 bg-yellow-400 text-yellow-900 rounded-lg hover:bg-yellow-500 transition-colors"
            >
              카카오
            </a>
            <a
              href={mapUrl("naver", detail.address)}
              target="_blank" rel="noopener noreferrer"
              className="text-[11px] font-bold px-2.5 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              네이버
            </a>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-400 bg-white rounded-xl px-4 py-3 border border-gray-100">📍 장소 미정</p>
      )}

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
          {(detail.contact_phone || detail.client_profile?.phone) ? (
            <a
              href={`tel:${(detail.contact_phone ?? detail.client_profile?.phone ?? "").replace(/[^0-9+]/g, "")}`}
              className="flex items-center gap-1.5 px-4 py-2 bg-hwaseong-blue text-white text-xs font-bold rounded-xl hover:bg-blue-900 transition-colors flex-shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
              </svg>
              {detail.contact_phone ?? detail.client_profile?.phone}
            </a>
          ) : (
            <span className="text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded-xl">연락처 미등록</span>
          )}
        </div>
      </div>

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
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        mat.uploader.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                      }`}>
                        {mat.uploader.role === "admin" ? "운영자" : "수요처"}
                      </span>
                    )}
                    {mat.file_size_kb && (
                      <span className="text-[10px] text-gray-400">{fmtFileSize(mat.file_size_kb)}</span>
                    )}
                  </div>
                </div>
                <a
                  href={mat.file_url} target="_blank" rel="noopener noreferrer" download
                  className="flex-shrink-0 text-[11px] font-bold px-3 py-1.5 bg-hwaseong-blue/10 text-hwaseong-blue rounded-xl hover:bg-hwaseong-blue hover:text-white transition-colors"
                >
                  ↓ 다운로드
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {detail.notes && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          <p className="text-[10px] font-bold text-amber-600 mb-1">📝 수요처 요청사항</p>
          <p className="text-xs text-amber-800 leading-relaxed">{detail.notes}</p>
        </div>
      )}
    </div>
  );
}

function ReportDetailPanel({
  report: r,
  matchType,
  totalSessions,
}: {
  report: Report;
  matchType: LectureType | null;
  totalSessions?: number | null;
}) {
  const isIntensive  = matchType === "intensive";
  const isLongterm   = matchType === "longterm";
  const showSession  = isLongterm && (totalSessions ?? 1) > 1;
  const dates        = isIntensive && r.lecture_dates?.length > 0 ? r.lecture_dates : [r.lecture_date];
  const fmtDate      = (d: string) =>
    new Date(d).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3 shadow-sm">

      {/* 회차 레이블 (장기정기형 다회차) */}
      {showSession && (
        <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
          <span className="text-xs font-black text-hwaseong-blue bg-hwaseong-blue/10 px-2.5 py-1 rounded-lg">
            {(r.session_index ?? 0) + 1}회차
          </span>
          <span className="text-[10px] text-gray-400">/ 총 {totalSessions}회</span>
        </div>
      )}

      {/* 헤더: 상태 + 제출일 */}
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
          r.client_rejected_at
            ? "bg-red-100 text-red-700"
            : r.admin_approved_at
              ? "bg-green-100 text-green-700"
              : "bg-amber-100 text-amber-700"
        }`}>
          {r.client_rejected_at ? "↩ 반려됨" : r.admin_approved_at ? "✓ 승인완료" : "⏳ 승인대기"}
        </span>
        <span className="text-[10px] text-gray-400">
          제출 {new Date(r.submitted_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
        </span>
      </div>

      {/* 반려 사유 */}
      {r.client_rejected_at && r.client_rejection_reason && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
          <p className="text-[10px] font-bold text-red-600 mb-1">반려 사유</p>
          <p className="text-xs text-red-700 leading-relaxed">"{r.client_rejection_reason}"</p>
        </div>
      )}

      {/* 강의 날짜 */}
      <div className="space-y-1">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">강의 날짜</p>
        {isIntensive && dates.length > 1 ? (
          <div className="flex flex-wrap gap-1.5">
            {dates.map((d, i) => (
              <span key={d} className="text-xs bg-yellow-50 text-yellow-800 font-semibold px-2.5 py-1 rounded-lg border border-yellow-100">
                {i + 1}일차 · {fmtDate(d)}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm font-semibold text-gray-700">{fmtDate(dates[0])}</p>
        )}
      </div>

      {/* 참석 인원 + 평점 */}
      <div className="flex items-center gap-4">
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">실제 참석</p>
          <p className="text-sm font-bold text-hwaseong-text">{r.attendance_count}명</p>
        </div>
        {r.rating_from_client !== null && (
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">수요처 평점</p>
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map((i) => (
                <svg key={i} className={`w-3.5 h-3.5 ${i <= Math.round(r.rating_from_client!) ? "text-amber-400" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
              <span className="text-xs font-bold text-amber-600 ml-1">{Number(r.rating_from_client).toFixed(1)}</span>
            </div>
          </div>
        )}
      </div>

      {/* 교육 내용 */}
      {r.report_text && (
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">교육 내용</p>
          <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line bg-gray-50 rounded-xl px-3 py-2.5">
            {r.report_text}
          </p>
        </div>
      )}

      {/* 현장 사진 */}
      {r.image_urls?.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">현장 사진</p>
          <div className="flex gap-2 flex-wrap">
            {r.image_urls.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                className="w-20 h-20 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0 hover:opacity-80 transition-opacity">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`현장사진 ${i + 1}`} className="w-full h-full object-cover" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
