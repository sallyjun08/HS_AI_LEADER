import Head from "next/head";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/lib/auth-context";
import DashboardLayout from "@/components/DashboardLayout";
import LectureCalendar from "@/components/LectureCalendar";

// ─── Types ────────────────────────────────────────────────────────────────────

type LectureTimeSlot = {
  date?: string;
  day?: string;
  startTime?: string;
  start?: string;
  endTime?: string;
  end?: string;
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

type FilterType = "all" | LectureType;

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_KR: Record<string, string> = {
  mon: "월", tue: "화", wed: "수", thu: "목", fri: "금", sat: "토", sun: "일",
};

const REJECT_REASONS = [
  "일정이 맞지 않아요",
  "전문 분야가 맞지 않아요",
  "이동 거리가 너무 멀어요",
  "강의 규모·형태가 맞지 않아요",
  "기타 (직접 입력)",
];

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: "all",       label: "전체" },
  { value: "oneday",    label: "원데이형" },
  { value: "intensive", label: "집중코스형" },
  { value: "longterm",  label: "장기정기형" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

export default function LeaderMatchesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [matches, setMatches]               = useState<MatchRequest[]>([]);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [rejectModal, setRejectModal]       = useState<{ matchId: string; title: string } | null>(null);
  const [rejectPreset, setRejectPreset]     = useState("");
  const [rejectCustom, setRejectCustom]     = useState("");
  const [rejectingId, setRejectingId]       = useState<string | null>(null);
  const [toast, setToast]                   = useState<{ msg: string; ok: boolean } | null>(null);
  const [filter, setFilter]                 = useState<FilterType>("all");
  const [expandedCalendar, setExpandedCalendar] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== "leader")) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  async function fetchAll() {
    const m = await fetch("/api/match-requests").then((r) => r.json());
    if (Array.isArray(m)) setMatches(m);
  }

  useEffect(() => {
    if (user) fetchAll();
  }, [user]);

  async function acceptMatch(matchId: string) {
    setActionInProgress(matchId);
    const res = await fetch(`/api/match-requests/${matchId}/accept`, { method: "PATCH" });
    if (res.ok) { await fetchAll(); setToast({ msg: "매칭을 수락했습니다.", ok: true }); }
    else setToast({ msg: "처리 중 오류가 발생했습니다.", ok: false });
    setActionInProgress(null);
  }

  async function rejectMatch(matchId: string) {
    const reason = rejectPreset === "기타 (직접 입력)" ? rejectCustom : rejectPreset;
    setRejectingId(matchId);
    const res = await fetch(`/api/match-requests/${matchId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (res.ok) {
      await fetchAll();
      setToast({ msg: "거절 처리되었습니다. 관리자가 재배정합니다.", ok: false });
    } else {
      setToast({ msg: "처리 중 오류가 발생했습니다.", ok: false });
    }
    setRejectingId(null);
    setRejectModal(null);
    setRejectPreset("");
    setRejectCustom("");
  }

  function openRejectModal(m: MatchRequest) {
    setRejectModal({ matchId: m.id, title: m.title });
    setRejectPreset("");
    setRejectCustom("");
  }

  const filteredMatches = useMemo(
    () => filter === "all" ? matches : matches.filter((m) => m.lecture_type === filter),
    [matches, filter],
  );

  const pendingMatches = useMemo(() => filteredMatches.filter((m) => m.status === "matched"), [filteredMatches]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-hwaseong-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const rejectConfirmDisabled =
    rejectingId !== null ||
    !rejectPreset ||
    (rejectPreset === "기타 (직접 입력)" && !rejectCustom.trim());

  return (
    <>
      <Head><title>매칭 요청 | 화성 AI 시민리더 잇다</title></Head>
      <DashboardLayout pageTitle="매칭 요청">

        {/* 강의 유형 필터 */}
        <div className="flex gap-2 flex-wrap">
          {FILTER_OPTIONS.map((opt) => {
            const count = opt.value === "all"
              ? matches.filter((m) => m.status === "matched").length
              : matches.filter((m) => m.lecture_type === opt.value && m.status === "matched").length;
            const active = filter === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                  active
                    ? "bg-hwaseong-blue text-white border-hwaseong-blue shadow-sm"
                    : "bg-white text-gray-500 border-gray-200 hover:border-hwaseong-blue/40 hover:text-hwaseong-blue"
                }`}
              >
                {opt.label}
                {count > 0 && (
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                    active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 신규 배정 알림 배너 */}
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
          </div>
        )}

        {/* 수락 대기 */}
        {pendingMatches.length > 0 && (
          <section className="space-y-3">
            <SectionHeader label="수락 대기" icon="🔔" colorKey="amber" count={pendingMatches.length} />
            {pendingMatches.map((m) => {
              const calOpen = expandedCalendar === m.id;
              return (
                <MatchCard
                  key={m.id}
                  match={m}
                  actionInProgress={actionInProgress}
                  onAccept={() => acceptMatch(m.id)}
                  onReject={() => openRejectModal(m)}
                  showAcceptReject
                  extra={
                    <div className="mt-3 pt-2.5 border-t border-gray-100">
                      <button
                        onClick={() => setExpandedCalendar(calOpen ? null : m.id)}
                        className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-colors border ${
                          calOpen
                            ? "bg-amber-50 border-amber-200 text-amber-700"
                            : "bg-gray-50 border-gray-200 text-gray-500 hover:border-amber-200 hover:text-amber-700 hover:bg-amber-50"
                        }`}
                      >
                        <span>📅</span>
                        {calOpen ? "일정 미리보기 닫기" : "수락 시 내 일정 확인하기"}
                        <span className="text-[10px]">{calOpen ? "▲" : "▼"}</span>
                      </button>
                      {calOpen && (
                        <div className="mt-3">
                          <LectureCalendar matches={matches.filter((x) => x.status === "ongoing")} previewMatch={m} />
                        </div>
                      )}
                    </div>
                  }
                />
              );
            })}
          </section>
        )}

        {filteredMatches.filter((m) => m.status === "matched").length === 0 && (
          <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 text-gray-400">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-sm">수락 대기 중인 매칭 요청이 없습니다.</p>
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

      {/* 거절 사유 선택 모달 */}
      {rejectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={(e) => { if (e.target === e.currentTarget) setRejectModal(null); }}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <p className="text-xs font-semibold text-red-500 mb-1.5">매칭 거절</p>
              <h3 className="font-bold text-hwaseong-text text-sm leading-snug line-clamp-2">
                {rejectModal.title}
              </h3>
            </div>
            <div className="px-6 py-4 space-y-3">
              <p className="text-xs text-gray-500">거절 처리 후 관리자가 다른 강사로 재배정합니다.</p>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-600 mb-1">거절 사유를 선택해 주세요</p>
                {REJECT_REASONS.map((reason) => {
                  const selected = rejectPreset === reason;
                  return (
                    <label
                      key={reason}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                        selected
                          ? "border-red-300 bg-red-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        selected ? "border-red-500" : "border-gray-300"
                      }`}>
                        {selected && <div className="w-2 h-2 rounded-full bg-red-500" />}
                      </div>
                      <input
                        type="radio"
                        name="rejectReason"
                        value={reason}
                        checked={selected}
                        onChange={() => setRejectPreset(reason)}
                        className="sr-only"
                      />
                      <span className={`text-xs font-medium ${selected ? "text-red-700" : "text-gray-600"}`}>
                        {reason}
                      </span>
                    </label>
                  );
                })}
              </div>
              {rejectPreset === "기타 (직접 입력)" && (
                <textarea
                  rows={3}
                  value={rejectCustom}
                  onChange={(e) => setRejectCustom(e.target.value)}
                  placeholder="거절 사유를 직접 입력해 주세요."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-200 resize-none"
                  autoFocus
                />
              )}
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
                onClick={() => rejectMatch(rejectModal.matchId)}
                disabled={rejectConfirmDisabled}
                className="flex-1 py-3 bg-red-500 text-white text-sm font-bold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {rejectingId ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    처리 중...
                  </>
                ) : "거절 확인"}
              </button>
            </div>
          </div>
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

function MatchCard({
  match: m,
  actionInProgress,
  onAccept,
  onReject,
  showAcceptReject = false,
  muted = false,
  extra,
}: {
  match: MatchRequest;
  actionInProgress: string | null;
  onAccept: () => void;
  onReject: () => void;
  showAcceptReject?: boolean;
  muted?: boolean;
  extra?: React.ReactNode;
}) {
  const busy     = actionInProgress === m.id;
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

        {/* 데드라인 카운트다운 */}
        {showAcceptReject && m.matched_at && (
          <div className="mb-2">
            <DeadlineCountdown matchedAt={m.matched_at} />
          </div>
        )}

        {/* 수락 / 거절 버튼 */}
        {showAcceptReject && (
          <div className="flex gap-2 mt-1">
            <button
              onClick={onAccept}
              disabled={busy}
              className="flex-1 py-2.5 bg-hwaseong-blue text-white text-xs font-bold rounded-xl hover:bg-blue-900 transition-colors disabled:opacity-50"
            >
              {busy ? "처리 중..." : "✅ 수락"}
            </button>
            <button
              onClick={onReject}
              disabled={busy}
              className="flex-1 py-2.5 bg-white border-2 border-red-300 text-red-500 text-xs font-bold rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {busy ? "..." : "✕ 거절"}
            </button>
          </div>
        )}

        {extra}
      </div>
    </div>
  );
}

function DeadlineCountdown({ matchedAt }: { matchedAt: string }) {
  const deadline = new Date(new Date(matchedAt).getTime() + 24 * 60 * 60 * 1000);

  const [remaining, setRemaining] = useState(() => deadline.getTime() - Date.now());

  useEffect(() => {
    const id = setInterval(() => setRemaining(deadline.getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [deadline.getTime()]);

  if (remaining <= 0) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-2 bg-red-50 border border-red-200 rounded-xl">
        <span className="text-xs">⛔</span>
        <span className="text-xs font-bold text-red-600">마감 시간 초과 — 자동 거절 처리 예정</span>
      </div>
    );
  }

  const totalSecs = Math.floor(remaining / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  const isUrgent  = remaining < 60 * 60 * 1000;       // < 1시간
  const isWarning = remaining < 6 * 60 * 60 * 1000;   // < 6시간

  const colors = isUrgent
    ? { bg: "bg-red-50 border-red-200",   text: "text-red-600",   label: "text-red-500",   icon: "🚨" }
    : isWarning
    ? { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", label: "text-amber-500", icon: "⚠️" }
    : { bg: "bg-blue-50 border-blue-100",  text: "text-blue-700",  label: "text-blue-400",  icon: "⏱️" };

  return (
    <div className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border ${colors.bg}`}>
      <div className="flex items-center gap-1.5">
        <span className="text-xs">{colors.icon}</span>
        <span className={`text-[11px] font-semibold ${colors.label}`}>수락 마감</span>
        <span className={`text-[10px] ${colors.label}`}>
          {deadline.toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}{" "}
          {deadline.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
      <span className={`text-sm font-black tabular-nums ${colors.text} ${isUrgent ? "animate-pulse" : ""}`}>
        {h > 0 ? `${pad(h)}:` : ""}{pad(m)}:{pad(s)}
      </span>
    </div>
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
