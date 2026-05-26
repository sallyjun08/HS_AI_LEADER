import Head from "next/head";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/lib/auth-context";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Bird, Backpack, BookOpen, Pencil, GraduationCap,
  Briefcase, Home, Smile, PenLine,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
type AvailableSlots = { days: string[]; start: string; end: string };

type RentalSetting = {
  id: string;
  type: "venue" | "equipment";
  name: string;
  address: string | null;
  capacity: number | null;
  features: string[];
  fee_per_use: number;
  fee_unit: string;
  max_quantity: number | null;
  available: boolean;
  available_slots: AvailableSlots | null;
  district: string | null;
};

const DAY_LABELS: Record<string, string> = {
  mon: "월", tue: "화", wed: "수", thu: "목", fri: "금", sat: "토", sun: "일",
};

function addHours(time: string, hours: number): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + Math.round(hours * 60);
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function generateTimeSlots(venueStart: string, venueEnd: string, lectureHours: number): string[] {
  const start = timeToMinutes(venueStart);
  const end   = timeToMinutes(venueEnd);
  const dur   = Math.round(lectureHours * 60);
  const slots: string[] = [];
  for (let cur = start; cur + dur <= end; cur += 30) {
    slots.push(`${String(Math.floor(cur / 60)).padStart(2, "0")}:${String(cur % 60).padStart(2, "0")}`);
  }
  return slots;
}

function generateStartSlots(from = "06:00", to = "22:00"): string[] {
  const start = timeToMinutes(from);
  const end   = timeToMinutes(to);
  const slots: string[] = [];
  for (let cur = start; cur <= end; cur += 30) {
    slots.push(`${String(Math.floor(cur / 60)).padStart(2, "0")}:${String(cur % 60).padStart(2, "0")}`);
  }
  return slots;
}

function generateEndSlots(startTime: string, to = "23:00"): string[] {
  if (!startTime) return [];
  const start = timeToMinutes(startTime) + 30;
  const end   = timeToMinutes(to);
  const slots: string[] = [];
  for (let cur = start; cur <= end; cur += 30) {
    slots.push(`${String(Math.floor(cur / 60)).padStart(2, "0")}:${String(cur % 60).padStart(2, "0")}`);
  }
  return slots;
}

const WEEKDAYS = [
  { key: "mon", label: "월" }, { key: "tue", label: "화" }, { key: "wed", label: "수" },
  { key: "thu", label: "목" }, { key: "fri", label: "금" }, { key: "sat", label: "토" }, { key: "sun", label: "일" },
];

function generateConsecutiveDates(
  startDate: string,
  count: number,
  startTime: string,
  endTime: string,
): { date: string; startTime: string; endTime: string; day: string }[] {
  if (!startDate || count <= 0) return [];
  const result: { date: string; startTime: string; endTime: string; day: string }[] = [];
  const MS_PER_DAY = 86_400_000;
  let current = new Date(startDate + "T00:00:00");
  for (let i = 0; i < count; i++) {
    const y = current.getFullYear();
    const mo = String(current.getMonth() + 1).padStart(2, "0");
    const d = String(current.getDate()).padStart(2, "0");
    result.push({ date: `${y}-${mo}-${d}`, startTime, endTime, day: ["sun","mon","tue","wed","thu","fri","sat"][current.getDay()] });
    current = new Date(current.getTime() + MS_PER_DAY);
  }
  return result;
}

function generateLongtermDates(
  startDate: string,
  weekdaySlots: { day: string; startTime: string; endTime: string }[],
  sessionCount: number,
): { date: string; startTime: string; endTime: string; day: string }[] {
  if (!startDate || weekdaySlots.length === 0 || sessionCount <= 0) return [];
  const orderedSlots = WEEKDAYS.map((w) => weekdaySlots.find((s) => s.day === w.key)).filter(Boolean) as typeof weekdaySlots;
  const result: { date: string; startTime: string; endTime: string; day: string }[] = [];
  const MS_PER_DAY = 86_400_000;
  let current = new Date(startDate + "T00:00:00");
  const limit = new Date(current.getTime() + 400 * MS_PER_DAY);
  while (result.length < sessionCount && current < limit) {
    const dayKey = ["sun","mon","tue","wed","thu","fri","sat"][current.getDay()];
    const slot = orderedSlots.find((s) => s.day === dayKey);
    if (slot) {
      const y = current.getFullYear();
      const mo = String(current.getMonth() + 1).padStart(2, "0");
      const d = String(current.getDate()).padStart(2, "0");
      result.push({ date: `${y}-${mo}-${d}`, startTime: slot.startTime, endTime: slot.endTime, day: dayKey });
    }
    current = new Date(current.getTime() + MS_PER_DAY);
  }
  return result;
}

function formatHours(h: number): string {
  const w = Math.floor(h);
  const mins = Math.round((h - w) * 60);
  if (mins === 0) return `${w}시간`;
  if (w === 0) return `${mins}분`;
  return `${w}시간 ${mins}분`;
}

function formatSlots(slots: AvailableSlots | null): string {
  if (!slots || slots.days.length === 0) return "운영 시간 미정";
  const days = ["mon","tue","wed","thu","fri","sat","sun"]
    .filter((d) => slots.days.includes(d))
    .map((d) => DAY_LABELS[d])
    .join("·");
  return `${days}  ${slots.start} ~ ${slots.end}`;
}

type AudienceOption = {
  value: string;
  line1: string;
  line2?: string;
  Icon: LucideIcon;
  iconColor: string;
};

/** 강사 매칭 시 강사의 전문 분야와 대조하는 핵심 파라미터로 사용됨 */
const TARGET_AUDIENCE_OPTIONS: AudienceOption[] = [
  { value: "초등(저학년)", line1: "초등",    line2: "저학년",   Icon: Bird,          iconColor: "text-yellow-500" },
  { value: "초등(고학년)", line1: "초등",    line2: "고학년",   Icon: Backpack,      iconColor: "text-orange-400" },
  { value: "중학생",       line1: "중학생",                     Icon: BookOpen,      iconColor: "text-blue-500"   },
  { value: "고등학생",     line1: "고등학생",                   Icon: Pencil,        iconColor: "text-indigo-500" },
  { value: "대학생",       line1: "대학생",                     Icon: GraduationCap, iconColor: "text-purple-500" },
  { value: "성인",         line1: "성인",                       Icon: Briefcase,     iconColor: "text-teal-600"   },
  { value: "학부모",       line1: "학부모",                     Icon: Home,          iconColor: "text-green-600"  },
  { value: "시니어(노인)", line1: "시니어",  line2: "노인",     Icon: Smile,         iconColor: "text-rose-400"   },
  { value: "기타(직접 입력)", line1: "기타", line2: "직접 입력", Icon: PenLine,      iconColor: "text-gray-400"   },
];
type Leader = {
  id: string;
  is_verified: boolean;
  rating_avg: number;
  specialties: string[];
  profiles: { name: string } | null;
};

const FEE_PER_SESSION = 30_000;

type LectureType = "oneday" | "intensive" | "longterm";

const LECTURE_TYPES: {
  value: LectureType;
  emoji: string;
  name: string;
  question: string;
  desc: string;
  sessionDefault: number;
  sessionMin: number;
  sessionMax: number;
  color: string;
  bg: string;
  ring: string;
  text: string;
}[] = [
  {
    value: "oneday",
    emoji: "⚡",
    name: "원데이형",
    question: "하루만 진행하는 특강인가요?",
    desc: "단 1회 · 보통 2~4시간",
    sessionDefault: 1, sessionMin: 1, sessionMax: 1,
    color: "amber", bg: "bg-amber-50", ring: "ring-amber-400", text: "text-amber-700",
  },
  {
    value: "intensive",
    emoji: "📚",
    name: "집중코스형",
    question: "2~5일 이내로 단기간에 끝내는 수업인가요?",
    desc: "2~5회 연속 · 주제 집중 심화",
    sessionDefault: 3, sessionMin: 2, sessionMax: 5,
    color: "blue", bg: "bg-blue-50", ring: "ring-blue-400", text: "text-blue-700",
  },
  {
    value: "longterm",
    emoji: "📅",
    name: "장기정기형",
    question: "1개월 이상 매주 정기적으로 진행되나요?",
    desc: "월 4회 이상 · 장기 커리큘럼",
    sessionDefault: 8, sessionMin: 6, sessionMax: 99,
    color: "purple", bg: "bg-purple-50", ring: "ring-purple-400", text: "text-purple-700",
  },
];

function formatKRW(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

type MatchRequest = {
  id: string;
  title: string;
  category: string;
  lecture_type: "oneday" | "intensive" | "longterm" | null;
  /** 강사 매칭 시 강사의 전문 분야와 대조하는 핵심 파라미터로 사용됨 */
  target_audience: string[] | null;
  participant_count: number;
  session_count?: number;
  start_date: string;
  address: string | null;
  notes: string | null;
  status: string;
  is_approved: boolean;
  cancel_reason: string | null;
  needs_venue?: boolean;
  rental_venue_id?: string | null;
  needs_equipment?: boolean;
  rental_equipment_count?: number;
  rental_notes?: string | null;
  lecture_times?: { type?: string; day?: string; start?: string; end?: string }[] | null;
  leader: Leader | null;
};

const STATUS_MAP: Record<string, { label: string; cls: string; icon: string; desc: string }> = {
  reviewing: {
    label: "검토 중",
    cls:   "bg-orange-100 text-orange-800 ring-1 ring-orange-300",
    icon:  "📋",
    desc:  "운영자가 요청을 검토하고 있습니다. 승인 후 강사 매칭이 시작됩니다.",
  },
  pending:   {
    label: "강사 매칭 중",
    cls:   "bg-amber-100 text-amber-800 ring-1 ring-amber-300",
    icon:  "🔍",
    desc:  "최적의 강사를 찾고 있습니다. 잠시만 기다려 주세요.",
  },
  matched:   {
    label: "강사 수락 대기 중",
    cls:   "bg-sky-100 text-sky-800 ring-1 ring-sky-300",
    icon:  "⏳",
    desc:  "배정된 강사가 일정을 검토 중입니다.",
  },
  ongoing:   {
    label: "강의 진행 확정",
    cls:   "bg-green-100 text-green-800 ring-1 ring-green-300",
    icon:  "✅",
    desc:  "강의 일정이 확정되었습니다. 강사 연락처가 공개됩니다.",
  },
  rejected:  {
    label: "강사 재매칭 중",
    cls:   "bg-indigo-100 text-indigo-800 ring-1 ring-indigo-300",
    icon:  "🔄",
    desc:  "더 적합한 강사를 찾고 있습니다. 곧 연락드리겠습니다.",
  },
  completed: {
    label: "강의 완료",
    cls:   "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
    icon:  "🎓",
    desc:  "강의가 완료되었습니다. 만족도 평점을 남겨 주세요.",
  },
  cancelled: {
    label: "취소됨",
    cls:   "bg-red-50 text-red-500 ring-1 ring-red-200",
    icon:  "✕",
    desc:  "",
  },
};

type ClientReport = {
  id: string;
  match_id: string;
  rating_from_client: number | null;
  client_feedback: string | null;
};

type ReviewState = { reportId: string; rating: number; feedback: string };

export default function ClientDashboard() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [requests, setRequests] = useState<MatchRequest[]>([]);
  const [reports, setReports] = useState<ClientReport[]>([]);
  const [form, setForm] = useState({
    lectureType: "" as "" | LectureType,
    institutionName: user?.orgName ?? "", contactPhone: "",
    title: "", category: "",
    targetAudience: [] as string[],
    customAudience: "",
    participantCount: "20", sessionCount: "1", lectureHours: "2.0",
    startDate: "", endDate: "", startTime: "", endTime: "",
    weekdaySlots: [] as { day: string; startTime: string; endTime: string }[],
    address: "", notes: "",
    rentalEnabled: false, rentalVenueId: "",
    sessionSlots: [{ date: "", startTime: "" }] as { date: string; startTime: string }[],
    rentalEquipmentCount: "0", rentalNotes: "",
  });
  const [rentalSettings, setRentalSettings] = useState<RentalSetting[]>([]);
  const [venueDistrictFilter, setVenueDistrictFilter] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reviewState, setReviewState] = useState<ReviewState | null>(null);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [activePage, setActivePage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);

  useEffect(() => {
    if (!loading && (!user || user.role !== "client")) router.replace("/login");
  }, [loading, user, router]);

  async function fetchAll() {
    const [reqs, reps] = await Promise.all([
      fetch("/api/match-requests").then((r) => r.json()).catch(() => []),
      fetch("/api/activity-reports").then((r) => r.json()).catch(() => []),
    ]);
    if (Array.isArray(reqs)) setRequests(reqs);
    if (Array.isArray(reps)) setReports(reps);
  }

  useEffect(() => {
    if (!user) return;
    fetchAll();
    fetch("/api/public/rental-settings")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setRentalSettings(d); })
      .catch(() => {});
  }, [user]);

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const audience = form.targetAudience.map((a) =>
        a === "기타(직접 입력)" ? (form.customAudience.trim() || "기타") : a
      );
      const res = await fetch("/api/match-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lectureType: form.lectureType || null,
          institutionName: form.institutionName || null,
          contactPhone: form.contactPhone || null,
          title: form.title,
          category: form.category,
          targetAudience: audience,
          participantCount: Number(form.participantCount),
          sessionCount: Number(form.sessionCount) || 1,
          lectureHours: formLectureHours,
          startDate: form.startDate,
          endDate: form.endDate || null,
          address: form.address,
          notes: form.notes,
          needsVenue: form.rentalEnabled && form.rentalVenueId !== "",
          rentalVenueId: form.rentalEnabled && form.rentalVenueId ? form.rentalVenueId : null,
          rentalStartTime: form.rentalEnabled && form.rentalVenueId
            ? (form.lectureType === "longterm" ? longtermAutoSlots[0]?.startTime
              : form.lectureType === "intensive" ? intensiveAutoSlots[0]?.startTime
              : form.startTime) ?? null
            : null,
          lectureTimes: form.rentalEnabled && form.rentalVenueId
            ? form.lectureType === "longterm"
              ? longtermAutoSlots.map((s) => ({ date: s.date, start: s.startTime, end: s.endTime || addHours(s.startTime, formLectureHours) }))
              : form.lectureType === "intensive"
                ? intensiveAutoSlots.map((s) => ({ date: s.date, start: s.startTime, end: s.endTime }))
                : form.lectureType === "oneday" && form.startDate && form.startTime
                  ? [{ date: form.startDate, start: form.startTime, end: form.endTime || addHours(form.startTime, formLectureHours) }]
                  : []
            : form.lectureType === "longterm" && form.weekdaySlots.length > 0
              ? form.weekdaySlots.map((s) => ({ type: "recurring", day: s.day, start: s.startTime, end: s.endTime }))
              : form.lectureType === "oneday" && form.startTime && form.endTime
                ? [{ date: form.startDate, start: form.startTime, end: form.endTime }]
                : [],
          needsEquipment: form.rentalEnabled && Number(form.rentalEquipmentCount) > 0,
          rentalEquipmentCount: form.rentalEnabled ? Number(form.rentalEquipmentCount) : 0,
          rentalNotes: form.rentalEnabled && form.rentalNotes ? form.rentalNotes : null,
        }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      await fetchAll();
      setShowForm(false);
      setForm({ lectureType: "", institutionName: user?.orgName ?? "", contactPhone: "", title: "", category: "", targetAudience: [], customAudience: "", participantCount: "20", sessionCount: "1", lectureHours: "2.0", startDate: "", endDate: "", startTime: "", endTime: "", weekdaySlots: [], address: "", notes: "", rentalEnabled: false, rentalVenueId: "", sessionSlots: [{ date: "", startTime: "" }], rentalEquipmentCount: "0", rentalNotes: "" });
    } finally {
      setSubmitting(false);
    }
  }

  async function submitRating(reportId: string, rating: number, feedback: string) {
    setRatingSubmitting(true);
    try {
      const res = await fetch(`/api/activity-reports/${reportId}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, feedback }),
      });
      if (res.ok) {
        setReviewState(null);
        await fetchAll();
      }
    } finally {
      setRatingSubmitting(false);
    }
  }

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-hwaseong-blue border-t-transparent rounded-full animate-spin" /></div>;
  }

  const reportByMatchId = Object.fromEntries(reports.map((r) => [r.match_id, r]));

  const PAGE_SIZE = 5;
  const activeRequests = requests.filter((r) => r.status !== "completed");
  const completedRequests = [...requests.filter((r) => r.status === "completed")]
    .sort((a, b) => b.start_date.localeCompare(a.start_date));

  const pagedActive = activeRequests.slice((activePage - 1) * PAGE_SIZE, activePage * PAGE_SIZE);
  const pagedCompleted = completedRequests.slice((completedPage - 1) * PAGE_SIZE, completedPage * PAGE_SIZE);

  const pending = requests.filter((r) => r.status === "pending").length;
  const matched = requests.filter((r) => ["matched", "ongoing"].includes(r.status)).length;
  const completed = completedRequests.length;
  const totalFee = requests
    .filter((r) => r.status !== "cancelled")
    .reduce((sum, r) => sum + (r.session_count ?? 1) * FEE_PER_SESSION, 0);

  // 강의 유형별 회차 제한
  const selectedType = LECTURE_TYPES.find((t) => t.value === form.lectureType);
  const sessionMin = selectedType?.sessionMin ?? 1;
  const sessionMax = selectedType?.sessionMax ?? 99;

  // 폼 대여 비용 실시간 계산
  const formSessionCount = Number(form.sessionCount) || 1;
  const derivedLectureHours = (() => {
    if (form.lectureType === "oneday" && form.startTime && form.endTime)
      return (timeToMinutes(form.endTime) - timeToMinutes(form.startTime)) / 60;
    if (form.lectureType === "longterm" && form.weekdaySlots.length > 0) {
      const filled = form.weekdaySlots.filter((s) => s.startTime && s.endTime);
      if (filled.length === 0) return null;
      return filled.reduce((sum, s) => sum + (timeToMinutes(s.endTime) - timeToMinutes(s.startTime)) / 60, 0) / filled.length;
    }
    return null;
  })();
  const formLectureHours = derivedLectureHours ?? (Number(form.lectureHours) || 2);
  const selectedVenue = rentalSettings.find((s) => s.type === "venue" && s.id === form.rentalVenueId);
  const laptopSetting = rentalSettings.find((s) => s.id === "laptop");
  const venueFee = form.rentalEnabled && selectedVenue
    ? selectedVenue.fee_per_use * formLectureHours * formSessionCount : 0;
  const equipmentFee = form.rentalEnabled
    ? (Number(form.rentalEquipmentCount) || 0) * (laptopSetting?.fee_per_use ?? 0) * formLectureHours * formSessionCount : 0;
  const instructorFee = formSessionCount * FEE_PER_SESSION;
  const grandTotal = instructorFee + venueFee + equipmentFee;

  // 장기형 + 장소 대여: 반복 요일·시간으로 전 회차 날짜 자동 생성
  const longtermAutoSlots =
    form.lectureType === "longterm"
      ? generateLongtermDates(form.startDate, form.weekdaySlots, formSessionCount)
      : [];

  // 집중코스형 + 장소 대여: 시작일부터 연속 날짜 자동 생성
  const intensiveAutoSlots =
    form.lectureType === "intensive" && form.startDate && form.startTime
      ? generateConsecutiveDates(form.startDate, formSessionCount, form.startTime, addHours(form.startTime, formLectureHours))
      : [];

  return (
    <>
      <Head><title>수요처 대시보드 | 화성 AI 시민리더 잇다</title></Head>
      <DashboardLayout pageTitle="교육 수요처 대시보드">

        {/* 기관 헤더 */}
        <div className="bg-gradient-to-br from-green-700 to-teal-700 rounded-3xl overflow-hidden">
          <div className="p-6 sm:p-8 flex items-center gap-5">
            <div className="w-16 h-16 bg-white/20 border-2 border-white/40 rounded-2xl flex items-center justify-center text-3xl font-black text-white flex-shrink-0">
              🏢
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-black text-white">{user.orgName ?? user.name}</h2>
              <p className="text-green-100 text-sm">
                {user.orgType ? `${user.orgType} · ` : ""}교육 수요처 · 담당자 {user.name}
              </p>
            </div>
            <button onClick={signOut} className="text-xs bg-white/10 border border-white/30 text-white px-4 py-2 rounded-xl hover:bg-white/20 transition-colors flex-shrink-0">
              로그아웃
            </button>
          </div>
          <div className="bg-black/20 border-t border-white/10 grid grid-cols-3 divide-x divide-white/10">
            {[
              { label: "대기 중", value: pending },
              { label: "매칭 중", value: matched },
              { label: "완료", value: completed },
            ].map((s) => (
              <div key={s.label} className="py-3 text-center">
                <p className="text-white font-bold text-2xl">{s.value}</p>
                <p className="text-green-200 text-xs">{s.label}</p>
              </div>
            ))}
          </div>
          {totalFee > 0 && (
            <div className="bg-black/30 border-t border-white/10 px-5 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-green-200 text-xs">
                <span>💰</span>
                <span>진행 중인 강의 예상 강사비 합계</span>
              </div>
              <span className="text-white font-bold text-sm">{formatKRW(totalFee)}</span>
            </div>
          )}
        </div>

        {/* 목록 헤더 */}
        {!showForm && (
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-hwaseong-text text-sm">매칭 요청 현황</p>
              <p className="text-xs text-gray-400 mt-0.5">진행 중 {activeRequests.length}건{completed > 0 ? ` · 완료 ${completed}건` : ""}</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 active:scale-95 transition-all shadow-sm shadow-green-600/20"
            >
              <span className="text-base leading-none">+</span>
              새 매칭 요청
            </button>
          </div>
        )}

        {/* 매칭 요청 목록 */}
        {!showForm && (
          <div className="space-y-4">
            {activeRequests.length === 0 && (
              <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                <p className="text-5xl mb-4">📋</p>
                <p className="font-bold text-gray-500 mb-1">진행 중인 매칭 요청이 없습니다</p>
                <p className="text-xs text-gray-400 mb-6">강의 요청을 등록하면 최적의 강사를 매칭해 드립니다.</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="px-8 py-3 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 transition-colors"
                >
                  첫 매칭 요청하기
                </button>
              </div>
            )}
            {pagedActive.map((req) => {
              const displayStatus = req.status === "pending" && !req.is_approved ? "reviewing" : req.status;
              const st = STATUS_MAP[displayStatus] ?? { label: req.status, cls: "bg-gray-100 text-gray-500", icon: "", desc: "" };
              const isRevealed = ["matched", "ongoing"].includes(req.status);
              const isExpanded = expandedId === req.id;
              const l = req.leader;
              return (
                <div
                  key={req.id}
                  className={`bg-white rounded-2xl shadow-sm border transition-colors ${isExpanded ? "border-green-200" : "border-gray-100"}`}
                >
                  {/* 클릭 가능한 요약 헤더 */}
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : req.id)}
                    className="w-full text-left px-5 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-hwaseong-text text-sm leading-snug">{req.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{req.address} · {req.start_date}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${st.cls}`}>
                          {st.icon && <span className="text-[11px]">{st.icon}</span>}
                          {st.label}
                        </span>
                        <span className={`text-gray-300 text-sm transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>▾</span>
                      </div>
                    </div>

                    {/* 태그 요약 (항상 노출) */}
                    <div className="flex flex-wrap gap-1.5 mt-3 text-xs text-gray-500">
                      {req.lecture_type && (() => {
                        const lt = LECTURE_TYPES.find((t) => t.value === req.lecture_type);
                        if (!lt) return null;
                        return (
                          <span className={`font-semibold px-2 py-1 rounded-lg ${lt.bg} ${lt.text}`}>
                            {lt.emoji} {lt.name}
                          </span>
                        );
                      })()}
                      <span className="bg-gray-50 px-2 py-1 rounded-lg">🎯 {req.category}</span>
                      <span className="bg-gray-50 px-2 py-1 rounded-lg">👥 {req.participant_count}명</span>
                      {req.session_count && req.session_count > 0 && (
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg font-semibold">
                          💰 {formatKRW(req.session_count * FEE_PER_SESSION)}
                          <span className="font-normal text-emerald-500 ml-0.5">({req.session_count}회)</span>
                        </span>
                      )}
                      {(req.needs_venue || req.needs_equipment) && (
                        <span className="bg-orange-50 text-orange-600 px-2 py-1 rounded-lg">
                          🏢 {[
                            req.needs_venue && "공간",
                            req.needs_equipment && `노트북 ${req.rental_equipment_count}대`,
                          ].filter(Boolean).join(" · ")} 대여 신청
                        </span>
                      )}
                      {req.target_audience && req.target_audience.slice(0, 2).map((a) => (
                        <span key={a} className="bg-blue-50 text-blue-600 px-2 py-1 rounded-lg">{a}</span>
                      ))}
                      {(req.target_audience?.length ?? 0) > 2 && (
                        <span className="text-gray-400 px-1 py-1">+{(req.target_audience?.length ?? 0) - 2}</span>
                      )}
                      {req.lecture_type === "longterm" && req.lecture_times && req.lecture_times.filter((s) => s.type === "recurring" && s.day).map((s) => (
                        <span key={s.day} className="bg-purple-50 text-purple-700 px-2 py-1 rounded-lg font-medium">
                          {DAY_LABELS[s.day!] ?? s.day} {s.start}~{s.end}
                        </span>
                      ))}
                    </div>

                    {/* 수락 대기 중일 때 배정 강사 미리보기 */}
                    {req.status === "matched" && l && (
                      <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-sky-50 border border-sky-200 rounded-xl">
                        <div className="w-6 h-6 bg-hwaseong-blue/10 rounded-lg flex items-center justify-center text-xs font-bold text-hwaseong-blue flex-shrink-0">
                          {l.profiles?.name?.[0] ?? "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-semibold text-sky-800">
                            {l.profiles?.name ?? "-"}
                          </span>
                          {l.is_verified && (
                            <span className="ml-1.5 text-[10px] text-green-600 font-medium">✓ 인증 강사</span>
                          )}
                        </div>
                        <span className="text-[10px] text-sky-500 flex-shrink-0">수락 대기 중</span>
                      </div>
                    )}
                  </button>

                  {/* 펼쳐지는 상세 영역 */}
                  {isExpanded && (
                    <div className="px-5 pb-5 space-y-3 border-t border-gray-50 pt-4">
                      {/* 전체 교육 대상 태그 */}
                      {req.target_audience && req.target_audience.length > 2 && (
                        <div className="flex flex-wrap gap-1.5">
                          {req.target_audience.map((a) => (
                            <span key={a} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg">{a}</span>
                          ))}
                        </div>
                      )}

                      {/* 상태 안내 */}
                      {st.desc && (
                        <p className="text-xs text-blue-600 bg-blue-50 rounded-xl px-3 py-2">{st.desc}</p>
                      )}

                      {/* 배정된 강사 (안심매칭) */}
                      {l && (
                        <div className={`rounded-xl p-4 ${isRevealed ? "bg-green-50 border border-green-200" : "bg-blue-50 border border-blue-100"}`}>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-bold text-gray-700">배정된 강사</p>
                            {!isRevealed ? (
                              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">🔒 익명</span>
                            ) : (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✅ 공개됨</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-hwaseong-blue/10 rounded-xl flex items-center justify-center text-lg flex-shrink-0">
                              {isRevealed && l.profiles?.name ? l.profiles.name[0] : "?"}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-hwaseong-text">
                                {isRevealed ? (l.profiles?.name ?? "-") : maskName(l.profiles?.name ?? "강사")}
                              </p>
                              <div className="flex gap-2 mt-0.5 text-xs text-gray-500">
                                <span>⭐ {(l.rating_avg ?? 0).toFixed(1)}</span>
                                {l.is_verified && <span className="text-green-600">✓ 인증</span>}
                              </div>
                              {l.specialties.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {l.specialties.slice(0, 3).map((s) => (
                                    <span key={s} className="text-[10px] bg-white border border-gray-200 px-1.5 py-0.5 rounded">{s}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 평점 (완료 후) */}
                      {req.status === "completed" && (() => {
                        const report = reportByMatchId[req.id];
                        if (!report) {
                          return (
                            <p className="text-xs text-gray-400 text-center py-2">
                              강사가 아직 활동 보고서를 제출하지 않았습니다.
                            </p>
                          );
                        }
                        if (report.rating_from_client !== null) {
                          return (
                            <div className="px-3 py-2.5 bg-amber-50 border border-amber-100 rounded-xl space-y-1.5">
                              <div className="flex items-center gap-2">
                                <div className="flex gap-0.5">
                                  {[1,2,3,4,5].map((v) => (
                                    <span key={v} className={`text-base ${v <= report.rating_from_client! ? "text-amber-400" : "text-gray-200"}`}>★</span>
                                  ))}
                                </div>
                                <span className="text-xs font-semibold text-amber-700">{report.rating_from_client}점</span>
                                <span className="text-xs text-gray-400">· 평가 완료</span>
                              </div>
                              {report.client_feedback && (
                                <p className="text-xs text-gray-600 leading-relaxed">"{report.client_feedback}"</p>
                              )}
                            </div>
                          );
                        }
                        if (reviewState?.reportId === report.id) {
                          return (
                            <div className="px-3 py-3 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                              <div className="flex items-center gap-1">
                                {[1,2,3,4,5].map((v) => (
                                  <button
                                    key={v}
                                    onClick={() => setReviewState((p) => p ? { ...p, rating: v } : p)}
                                    className={`text-2xl transition-transform hover:scale-110 ${reviewState.rating >= v ? "text-amber-400" : "text-gray-200"}`}
                                  >★</button>
                                ))}
                                <span className="ml-2 text-xs font-bold text-amber-700">{reviewState.rating}점</span>
                              </div>
                              <textarea
                                rows={2}
                                value={reviewState.feedback}
                                onChange={(e) => setReviewState((p) => p ? { ...p, feedback: e.target.value } : p)}
                                placeholder="강사에 대한 피드백을 자유롭게 남겨주세요. (선택)"
                                className="w-full px-3 py-2 border border-amber-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-300/40 resize-none bg-white"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => submitRating(reviewState.reportId, reviewState.rating, reviewState.feedback)}
                                  disabled={ratingSubmitting}
                                  className="flex-1 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 disabled:opacity-60"
                                >{ratingSubmitting ? "제출 중..." : "평가 제출"}</button>
                                <button
                                  onClick={() => setReviewState(null)}
                                  className="px-3 py-1.5 text-xs text-gray-400 rounded-lg hover:bg-gray-100"
                                >취소</button>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <button
                            onClick={() => setReviewState({ reportId: report.id, rating: 5, feedback: "" })}
                            className="w-full py-2.5 border border-amber-200 text-amber-700 text-xs font-bold rounded-xl hover:bg-amber-50 transition-colors"
                          >
                            ⭐ 만족도 평가 남기기
                          </button>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
            {activeRequests.length > PAGE_SIZE && (
              <div className="flex items-center justify-between px-1 py-2">
                <button onClick={() => setActivePage((p) => Math.max(1, p - 1))} disabled={activePage === 1}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  ← 이전
                </button>
                <span className="text-xs text-gray-400">
                  <span className="font-bold text-hwaseong-text">{activePage}</span> / {Math.ceil(activeRequests.length / PAGE_SIZE)} 페이지
                  <span className="ml-2 text-gray-300">({activeRequests.length}건)</span>
                </span>
                <button onClick={() => setActivePage((p) => Math.min(Math.ceil(activeRequests.length / PAGE_SIZE), p + 1))} disabled={activePage === Math.ceil(activeRequests.length / PAGE_SIZE)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  다음 →
                </button>
              </div>
            )}
          </div>
        )}

        {/* 완료된 강의 섹션 */}
        {!showForm && completedRequests.length > 0 && (
          <div className="rounded-2xl border border-gray-100 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowCompleted((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">🎓</span>
                <span className="font-bold text-gray-600 text-sm">완료된 강의</span>
                <span className="text-xs bg-gray-200 text-gray-500 font-semibold px-2 py-0.5 rounded-full">{completedRequests.length}건</span>
              </div>
              <span className={`text-gray-400 text-sm transition-transform duration-200 ${showCompleted ? "rotate-180" : ""}`}>▾</span>
            </button>
            {showCompleted && (
              <div className="divide-y divide-gray-100">
                {pagedCompleted.map((req) => {
                  const st = STATUS_MAP.completed;
                  const isExpanded = expandedId === req.id;
                  const l = req.leader;
                  const report = reportByMatchId[req.id];
                  return (
                    <div key={req.id} className={`bg-white transition-colors ${isExpanded ? "bg-gray-50" : ""}`}>
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : req.id)}
                        className="w-full text-left px-5 py-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-700 text-sm leading-snug">{req.title}</p>
                            <p className="text-xs text-gray-400 mt-0.5 truncate">{req.address} · {req.start_date}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {report?.rating_from_client != null ? (
                              <span className="text-xs text-amber-600 font-semibold flex items-center gap-0.5">
                                {"★".repeat(report.rating_from_client)}{"☆".repeat(5 - report.rating_from_client)}
                              </span>
                            ) : (
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${st.cls}`}>{st.icon} {st.label}</span>
                            )}
                            <span className={`text-gray-300 text-sm transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>▾</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2 text-xs text-gray-400">
                          {req.lecture_type && (() => {
                            const lt = LECTURE_TYPES.find((t) => t.value === req.lecture_type);
                            if (!lt) return null;
                            return <span className={`font-medium px-2 py-0.5 rounded-md ${lt.bg} ${lt.text} opacity-70`}>{lt.emoji} {lt.name}</span>;
                          })()}
                          <span className="bg-gray-50 px-2 py-0.5 rounded-md">{req.category}</span>
                          <span className="bg-gray-50 px-2 py-0.5 rounded-md">👥 {req.participant_count}명</span>
                          {req.session_count && <span className="bg-gray-50 px-2 py-0.5 rounded-md">{req.session_count}회</span>}
                          {l && <span className="bg-gray-50 px-2 py-0.5 rounded-md">강사 {l.profiles?.name ?? "-"}</span>}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-5 pb-5 space-y-3 border-t border-gray-100 pt-4">
                          {/* 배정 강사 */}
                          {l && (
                            <div className="rounded-xl p-4 bg-gray-50 border border-gray-200">
                              <p className="text-xs font-bold text-gray-500 mb-2">강의 강사</p>
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-hwaseong-blue/10 rounded-xl flex items-center justify-center text-sm font-bold text-hwaseong-blue flex-shrink-0">
                                  {l.profiles?.name?.[0] ?? "?"}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-hwaseong-text">{l.profiles?.name ?? "-"}</p>
                                  <div className="flex gap-2 mt-0.5 text-xs text-gray-500">
                                    <span>⭐ {(l.rating_avg ?? 0).toFixed(1)}</span>
                                    {l.is_verified && <span className="text-green-600">✓ 인증</span>}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          {/* 평점 */}
                          {(() => {
                            if (!report) {
                              return <p className="text-xs text-gray-400 text-center py-2">강사가 아직 활동 보고서를 제출하지 않았습니다.</p>;
                            }
                            if (report.rating_from_client !== null) {
                              return (
                                <div className="px-3 py-2.5 bg-amber-50 border border-amber-100 rounded-xl space-y-1.5">
                                  <div className="flex items-center gap-2">
                                    <div className="flex gap-0.5">
                                      {[1,2,3,4,5].map((v) => (
                                        <span key={v} className={`text-base ${v <= report.rating_from_client! ? "text-amber-400" : "text-gray-200"}`}>★</span>
                                      ))}
                                    </div>
                                    <span className="text-xs font-semibold text-amber-700">{report.rating_from_client}점</span>
                                    <span className="text-xs text-gray-400">· 평가 완료</span>
                                  </div>
                                  {report.client_feedback && (
                                    <p className="text-xs text-gray-600 leading-relaxed">"{report.client_feedback}"</p>
                                  )}
                                </div>
                              );
                            }
                            if (reviewState?.reportId === report.id) {
                              return (
                                <div className="px-3 py-3 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                                  <div className="flex items-center gap-1">
                                    {[1,2,3,4,5].map((v) => (
                                      <button key={v} onClick={() => setReviewState((p) => p ? { ...p, rating: v } : p)}
                                        className={`text-2xl transition-transform hover:scale-110 ${reviewState.rating >= v ? "text-amber-400" : "text-gray-200"}`}>★</button>
                                    ))}
                                    <span className="ml-2 text-xs font-bold text-amber-700">{reviewState.rating}점</span>
                                  </div>
                                  <textarea rows={2} value={reviewState.feedback}
                                    onChange={(e) => setReviewState((p) => p ? { ...p, feedback: e.target.value } : p)}
                                    placeholder="강사에 대한 피드백을 자유롭게 남겨주세요. (선택)"
                                    className="w-full px-3 py-2 border border-amber-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-300/40 resize-none bg-white"
                                  />
                                  <div className="flex gap-2">
                                    <button onClick={() => submitRating(reviewState.reportId, reviewState.rating, reviewState.feedback)}
                                      disabled={ratingSubmitting}
                                      className="flex-1 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 disabled:opacity-60">
                                      {ratingSubmitting ? "제출 중..." : "평가 제출"}
                                    </button>
                                    <button onClick={() => setReviewState(null)} className="px-3 py-1.5 text-xs text-gray-400 rounded-lg hover:bg-gray-100">취소</button>
                                  </div>
                                </div>
                              );
                            }
                            return (
                              <button onClick={() => setReviewState({ reportId: report.id, rating: 5, feedback: "" })}
                                className="w-full py-2.5 border border-amber-200 text-amber-700 text-xs font-bold rounded-xl hover:bg-amber-50 transition-colors">
                                ⭐ 만족도 평가 남기기
                              </button>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })}
                {completedRequests.length > PAGE_SIZE && (
                  <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
                    <button onClick={() => setCompletedPage((p) => Math.max(1, p - 1))} disabled={completedPage === 1}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      ← 이전
                    </button>
                    <span className="text-xs text-gray-400">
                      <span className="font-bold text-hwaseong-text">{completedPage}</span> / {Math.ceil(completedRequests.length / PAGE_SIZE)} 페이지
                      <span className="ml-2 text-gray-300">({completedRequests.length}건)</span>
                    </span>
                    <button onClick={() => setCompletedPage((p) => Math.min(Math.ceil(completedRequests.length / PAGE_SIZE), p + 1))} disabled={completedPage === Math.ceil(completedRequests.length / PAGE_SIZE)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      다음 →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 새 매칭 요청 폼 */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* 폼 헤더 */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
              <button
                type="button"
                onClick={() => { setShowForm(false); setError(null); }}
                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 transition-colors flex-shrink-0"
              >
                ←
              </button>
              <h3 className="font-bold text-hwaseong-text text-sm">새 강의 매칭 요청</h3>
            </div>
            <div className="p-5">
            <form onSubmit={submitRequest} className="space-y-4">

              {/* 운영 형태 선택 */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-3">
                  강의 운영 형태 <span className="font-normal text-gray-400">(어떤 방식으로 진행되나요?)</span>
                </label>
                <div className="space-y-2">
                  {LECTURE_TYPES.map((lt) => {
                    const isSelected = form.lectureType === lt.value;
                    return (
                      <button
                        key={lt.value}
                        type="button"
                        onClick={() => {
                          const count = String(lt.sessionDefault);
                          const slots = Array.from({ length: lt.sessionDefault }, () => ({ date: "", startTime: "" }));
                          setForm((p) => ({
                            ...p,
                            lectureType: lt.value,
                            sessionCount: count,
                            sessionSlots: slots,
                            startDate: "", endDate: "", startTime: "", endTime: "", weekdaySlots: [],
                          }));
                        }}
                        className={`w-full text-left flex items-center gap-4 px-4 py-3.5 rounded-2xl border-2 transition-all ${
                          isSelected
                            ? `${lt.bg} border-current ${lt.text} ring-2 ${lt.ring} ring-offset-1`
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <span className="text-2xl flex-shrink-0">{lt.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-bold ${isSelected ? lt.text : "text-gray-700"}`}>{lt.name}</p>
                            {isSelected && (
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${lt.bg} ${lt.text}`}>선택됨</span>
                            )}
                          </div>
                          <p className={`text-xs mt-0.5 ${isSelected ? lt.text : "text-gray-500"}`}>{lt.question}</p>
                          <p className={`text-[11px] mt-0.5 ${isSelected ? `${lt.text} opacity-70` : "text-gray-400"}`}>{lt.desc}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          isSelected ? `${lt.bg} border-current ${lt.text}` : "border-gray-300"
                        }`}>
                          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-current" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 기관명 + 담당자 연락처 */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">담당자 연락처</label>
                <input
                  type="tel" value={form.contactPhone}
                  onChange={(e) => setForm((p) => ({ ...p, contactPhone: e.target.value }))}
                  placeholder="010-0000-0000"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">요청 제목</label>
                <input
                  type="text" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="예: 2026년 상반기 AI 리터러시 교육" required
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">교육 분야 / 주제</label>
                <input
                  type="text" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  placeholder="예: 생성형 AI 기초, ChatGPT 업무 활용" required
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30"
                />
              </div>
              <AudiencePicker
                selected={form.targetAudience}
                customValue={form.customAudience}
                onToggle={(val) =>
                  setForm((p) => ({
                    ...p,
                    targetAudience: p.targetAudience.includes(val)
                      ? p.targetAudience.filter((a) => a !== val)
                      : [...p.targetAudience, val],
                  }))
                }
                onCustomChange={(v) => setForm((p) => ({ ...p, customAudience: v }))}
              />
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">예상 인원</label>
                <input
                  type="number" min="1" value={form.participantCount}
                  onChange={(e) => setForm((p) => ({ ...p, participantCount: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30"
                />
              </div>

              {/* 일정 입력 — 유형별 동적 렌더링 */}
              <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/40 space-y-4">
                <p className="text-xs font-bold text-gray-500">📆 강의 일정</p>

                {/* 원데이형 */}
                {form.lectureType === "oneday" && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">날짜</label>
                      <input
                        type="date" value={form.startDate} required
                        onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">시작 시간</label>
                        <select
                          value={form.startTime} required
                          onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value, endTime: "" }))}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                        >
                          <option value="">시간 선택</option>
                          {generateStartSlots().map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">종료 시간</label>
                        <select
                          value={form.endTime} required
                          onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
                          disabled={!form.startTime}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/30 disabled:opacity-40"
                        >
                          <option value="">시간 선택</option>
                          {generateEndSlots(form.startTime).map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                    {form.startTime && form.endTime && (
                      <p className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
                        ⏱ {form.startTime} ~ {form.endTime} · 총 {formatHours(formLectureHours)}
                      </p>
                    )}
                  </div>
                )}

                {/* 집중코스형 */}
                {form.lectureType === "intensive" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">시작일</label>
                        <input
                          type="date" value={form.startDate} required
                          onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">종료일</label>
                        <input
                          type="date" value={form.endDate}
                          min={form.startDate || undefined}
                          onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-2">
                          총 회차 <span className="font-normal text-gray-400">(2~5회)</span>
                        </label>
                        <div className="flex items-center gap-2">
                          <button type="button"
                            onClick={() => setForm((p) => { const next = Math.max(2, Number(p.sessionCount) - 1); return { ...p, sessionCount: String(next), sessionSlots: p.sessionSlots.slice(0, next) }; })}
                            disabled={Number(form.sessionCount) <= 2}
                            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 text-lg font-bold hover:bg-gray-100 disabled:opacity-40">−</button>
                          <span className="text-sm font-bold text-hwaseong-text w-10 text-center">{form.sessionCount}회</span>
                          <button type="button"
                            onClick={() => setForm((p) => { const next = Math.min(5, Number(p.sessionCount) + 1); return { ...p, sessionCount: String(next), sessionSlots: [...p.sessionSlots, { date: "", startTime: "" }] }; })}
                            disabled={Number(form.sessionCount) >= 5}
                            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 text-lg font-bold hover:bg-gray-100 disabled:opacity-40">+</button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-2">회당 강의 시간</label>
                        <div className="flex items-center gap-2">
                          <button type="button"
                            onClick={() => setForm((p) => ({ ...p, lectureHours: String(Math.round((Math.max(0.5, Number(p.lectureHours) - 0.5)) * 10) / 10) }))}
                            disabled={Number(form.lectureHours) <= 0.5}
                            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 text-lg font-bold hover:bg-gray-100 disabled:opacity-40">−</button>
                          <span className="text-sm font-bold text-hwaseong-text w-16 text-center">{formatHours(Number(form.lectureHours))}</span>
                          <button type="button"
                            onClick={() => setForm((p) => ({ ...p, lectureHours: String(Math.round((Math.min(12, Number(p.lectureHours) + 0.5)) * 10) / 10) }))}
                            disabled={Number(form.lectureHours) >= 12}
                            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 text-lg font-bold hover:bg-gray-100 disabled:opacity-40">+</button>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">강의 시작 시간</label>
                        <select
                          value={form.startTime}
                          onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/30"
                        >
                          <option value="">시간 선택</option>
                          {generateStartSlots().map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">종료 시간</label>
                        <div className="flex items-center h-[42px] px-3 border border-gray-100 rounded-xl bg-gray-50">
                          <span className="text-sm text-gray-500">
                            {form.startTime ? addHours(form.startTime, formLectureHours) : "-"}
                          </span>
                          <span className="text-[10px] text-gray-400 ml-1.5">자동</span>
                        </div>
                      </div>
                    </div>
                    {form.startTime && (
                      <p className="text-xs text-blue-700 bg-blue-50 px-3 py-2 rounded-lg">
                        ⏱ {form.startTime} ~ {addHours(form.startTime, formLectureHours)} · 회당 {formatHours(formLectureHours)}
                      </p>
                    )}
                  </div>
                )}

                {/* 장기정기형 */}
                {form.lectureType === "longterm" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">시작일</label>
                        <input
                          type="date"
                          value={form.startDate}
                          onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                          required
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/30"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">종료일</label>
                        <input
                          type="date"
                          value={form.endDate}
                          min={form.startDate || undefined}
                          onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/30"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-2">
                        진행 요일 <span className="font-normal text-gray-400">· 요일별 시간을 따로 설정할 수 있어요</span>
                      </label>
                      <div className="flex gap-1.5 mb-3">
                        {WEEKDAYS.map((d) => {
                          const on = form.weekdaySlots.some((s) => s.day === d.key);
                          return (
                            <button key={d.key} type="button"
                              onClick={() => setForm((p) => {
                                if (on) return { ...p, weekdaySlots: p.weekdaySlots.filter((s) => s.day !== d.key) };
                                const newSlot = { day: d.key, startTime: "", endTime: "" };
                                const ordered = WEEKDAYS
                                  .filter((wd) => p.weekdaySlots.some((s) => s.day === wd.key) || wd.key === d.key)
                                  .map((wd) => wd.key === d.key ? newSlot : p.weekdaySlots.find((s) => s.day === wd.key)!);
                                return { ...p, weekdaySlots: ordered };
                              })}
                              className={`w-9 h-9 rounded-xl text-xs font-bold border-2 transition-all ${on ? "bg-purple-600 border-purple-600 text-white" : "border-gray-200 bg-white text-gray-500 hover:border-purple-300"}`}>
                              {d.label}
                            </button>
                          );
                        })}
                      </div>
                      {form.weekdaySlots.length > 0 && (
                        <div className="space-y-2">
                          {form.weekdaySlots.map((slot) => {
                            const dayLabel = WEEKDAYS.find((d) => d.key === slot.day)?.label ?? slot.day;
                            const slotHours = slot.startTime && slot.endTime
                              ? (timeToMinutes(slot.endTime) - timeToMinutes(slot.startTime)) / 60 : null;
                            return (
                              <div key={slot.day} className="flex items-center gap-2 bg-white border border-purple-100 rounded-xl px-3 py-2">
                                <span className="text-xs font-bold text-purple-600 w-5 text-center flex-shrink-0">{dayLabel}</span>
                                <select
                                  value={slot.startTime}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setForm((p) => ({ ...p, weekdaySlots: p.weekdaySlots.map((s) => s.day === slot.day ? { ...s, startTime: val, endTime: "" } : s) }));
                                  }}
                                  required
                                  className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/30"
                                >
                                  <option value="">시작</option>
                                  {generateStartSlots().map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <span className="text-xs text-gray-400 flex-shrink-0">~</span>
                                <select
                                  value={slot.endTime}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setForm((p) => ({ ...p, weekdaySlots: p.weekdaySlots.map((s) => s.day === slot.day ? { ...s, endTime: val } : s) }));
                                  }}
                                  disabled={!slot.startTime}
                                  required
                                  className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400/30 disabled:opacity-40"
                                >
                                  <option value="">종료</option>
                                  {generateEndSlots(slot.startTime).map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>
                                {slotHours !== null && (
                                  <span className="text-xs text-purple-500 flex-shrink-0">{formatHours(slotHours)}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-2">
                        총 회차 <span className="font-normal text-gray-400">(6회 이상)</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <button type="button"
                          onClick={() => setForm((p) => { const next = Math.max(6, Number(p.sessionCount) - 1); return { ...p, sessionCount: String(next), sessionSlots: p.sessionSlots.slice(0, next) }; })}
                          disabled={Number(form.sessionCount) <= 6}
                          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 text-lg font-bold hover:bg-gray-100 disabled:opacity-40">−</button>
                        <span className="text-sm font-bold text-hwaseong-text w-10 text-center">{form.sessionCount}회</span>
                        <button type="button"
                          onClick={() => setForm((p) => { const next = Number(p.sessionCount) + 1; return { ...p, sessionCount: String(next), sessionSlots: [...p.sessionSlots, { date: "", startTime: "" }] }; })}
                          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 text-lg font-bold hover:bg-gray-100">+</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 유형 미선택 시 기본 입력 */}
                {!form.lectureType && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-2">강의 회차</label>
                      <div className="flex items-center gap-2">
                        <button type="button"
                          onClick={() => setForm((p) => { const next = Math.max(1, Number(p.sessionCount) - 1); return { ...p, sessionCount: String(next), sessionSlots: p.sessionSlots.slice(0, next) }; })}
                          disabled={Number(form.sessionCount) <= 1}
                          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 text-lg font-bold hover:bg-gray-100 disabled:opacity-40">−</button>
                        <span className="text-sm font-bold text-hwaseong-text w-10 text-center">{form.sessionCount}회</span>
                        <button type="button"
                          onClick={() => setForm((p) => { const next = Number(p.sessionCount) + 1; return { ...p, sessionCount: String(next), sessionSlots: [...p.sessionSlots, { date: "", startTime: "" }] }; })}
                          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 text-lg font-bold hover:bg-gray-100">+</button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-2">회당 강의 시간</label>
                      <div className="flex items-center gap-2">
                        <button type="button"
                          onClick={() => setForm((p) => ({ ...p, lectureHours: String(Math.round((Math.max(0.5, Number(p.lectureHours) - 0.5)) * 10) / 10) }))}
                          disabled={Number(form.lectureHours) <= 0.5}
                          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 text-lg font-bold hover:bg-gray-100 disabled:opacity-40">−</button>
                        <span className="text-sm font-bold text-hwaseong-text w-16 text-center">{formatHours(Number(form.lectureHours))}</span>
                        <button type="button"
                          onClick={() => setForm((p) => ({ ...p, lectureHours: String(Math.round((Math.min(12, Number(p.lectureHours) + 0.5)) * 10) / 10) }))}
                          disabled={Number(form.lectureHours) >= 12}
                          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 text-lg font-bold hover:bg-gray-100 disabled:opacity-40">+</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 공간·장비 대여 신청 */}
              <div className="border border-dashed border-gray-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => { setVenueDistrictFilter(null); setForm((p) => ({ ...p, rentalEnabled: !p.rentalEnabled, rentalVenueId: "", sessionSlots: Array.from({ length: Number(p.sessionCount) || 1 }, () => ({ date: "", startTime: "" })), rentalEquipmentCount: "0" })); }}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🏢</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-700">공간 · 장비 대여 신청</p>
                      <p className="text-xs text-gray-400">교육 장소나 노트북이 없으면 신청하세요</p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    form.rentalEnabled ? "bg-green-600 border-green-600" : "border-gray-300 bg-white"
                  }`}>
                    {form.rentalEnabled && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5L4.2 7.5L8.5 2.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </button>

                {form.rentalEnabled && (
                  <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-4 space-y-5">

                    {/* 장소 선택 */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-2">
                        교육 공간 선택 <span className="font-normal text-gray-400">(선택사항 · 직접 섭외 시 미선택)</span>
                      </label>
                      {/* 지역 필터 */}
                      {(() => {
                        const venueDists = Array.from(new Set(
                          rentalSettings.filter((s) => s.type === "venue" && s.available && s.district)
                            .map((s) => s.district as string)
                        )).sort();
                        if (venueDists.length < 2) return null;
                        return (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            <button
                              type="button"
                              onClick={() => setVenueDistrictFilter(null)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                venueDistrictFilter === null ? "bg-hwaseong-blue text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                              }`}
                            >
                              전체
                            </button>
                            {venueDists.map((d) => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => setVenueDistrictFilter(venueDistrictFilter === d ? null : d)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                  venueDistrictFilter === d ? "bg-hwaseong-blue text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                }`}
                              >
                                📍 {d}
                              </button>
                            ))}
                          </div>
                        );
                      })()}
                      <div className="space-y-2">
                        {rentalSettings.filter((s) => {
                          if (s.type !== "venue" || !s.available) return false;
                          if (venueDistrictFilter && s.district !== venueDistrictFilter) return false;
                          const vStart = s.available_slots ? timeToMinutes(s.available_slots.start) : 0;
                          const vEnd   = s.available_slots ? timeToMinutes(s.available_slots.end)   : 1440;
                          const vDays  = s.available_slots?.days ?? [];
                          if (form.lectureType === "oneday" && form.startDate && form.startTime && form.endTime) {
                            const dayKey = ["sun","mon","tue","wed","thu","fri","sat"][new Date(form.startDate + "T00:00:00").getDay()];
                            if (!vDays.includes(dayKey)) return false;
                            if (timeToMinutes(form.startTime) < vStart || timeToMinutes(form.endTime) > vEnd) return false;
                          }
                          if (form.lectureType === "intensive" && form.startDate && form.startTime) {
                            const endTime = addHours(form.startTime, formLectureHours);
                            const reqDays = [...new Set(Array.from({ length: formSessionCount }, (_, i) => {
                              const d = new Date(new Date(form.startDate + "T00:00:00").getTime() + i * 86_400_000);
                              return ["sun","mon","tue","wed","thu","fri","sat"][d.getDay()];
                            }))];
                            if (!reqDays.every((d) => vDays.includes(d))) return false;
                            if (timeToMinutes(form.startTime) < vStart || timeToMinutes(endTime) > vEnd) return false;
                          }
                          if (form.lectureType === "longterm" && form.weekdaySlots.length > 0) {
                            if (!form.weekdaySlots.every((ws) => vDays.includes(ws.day))) return false;
                            for (const ws of form.weekdaySlots) {
                              if (!ws.startTime || !ws.endTime) continue;
                              if (timeToMinutes(ws.startTime) < vStart || timeToMinutes(ws.endTime) > vEnd) return false;
                            }
                          }
                          return true;
                        }).map((venue) => {
                          const isSelected = form.rentalVenueId === venue.id;
                          return (
                            <button
                              key={venue.id}
                              type="button"
                              onClick={() => {
                                const newId = isSelected ? "" : venue.id;
                                setForm((p) => ({
                                  ...p,
                                  rentalVenueId: newId,
                                  sessionSlots: p.sessionSlots.map((s) => ({ ...s, startTime: "" })),
                                  address: newId ? (venue.address ?? p.address) : "",
                                }));
                              }}
                              className={`w-full text-left px-3.5 py-3 rounded-xl border-2 transition-all ${
                                isSelected
                                  ? "border-green-500 bg-green-50"
                                  : "border-gray-200 bg-white hover:border-gray-300"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className={`text-sm font-semibold ${isSelected ? "text-green-800" : "text-gray-700"}`}>
                                    {venue.name}
                                  </p>
                                  <p className="text-[11px] text-gray-400 mt-0.5 truncate">{venue.address}</p>
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">최대 {venue.capacity}명</span>
                                    {venue.features.slice(0, 3).map((f) => (
                                      <span key={f} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{f}</span>
                                    ))}
                                  </div>
                                  <p className={`text-[11px] mt-1.5 ${isSelected ? "text-green-600" : "text-gray-400"}`}>
                                    📅 {formatSlots(venue.available_slots)}
                                  </p>
                                </div>
                                <span className="text-[11px] font-bold text-orange-600 flex-shrink-0 mt-0.5">
                                  {formatKRW(venue.fee_per_use)}/{venue.fee_unit}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                        {/* 일정 조건에 맞는 장소가 없을 때 안내 */}
                        {(() => {
                          const scheduleSet =
                            (form.lectureType === "oneday" && !!form.startDate && !!form.startTime && !!form.endTime) ||
                            (form.lectureType === "intensive" && !!form.startDate && !!form.startTime) ||
                            (form.lectureType === "longterm" && form.weekdaySlots.length > 0);
                          const anyVisible = rentalSettings.some((s) => s.type === "venue" && s.available);
                          if (!scheduleSet || !anyVisible) return null;
                          // reuse same filter logic inline
                          const visible = rentalSettings.filter((s) => {
                            if (s.type !== "venue" || !s.available) return false;
                            if (venueDistrictFilter && s.district !== venueDistrictFilter) return false;
                            const vStart = s.available_slots ? timeToMinutes(s.available_slots.start) : 0;
                            const vEnd   = s.available_slots ? timeToMinutes(s.available_slots.end)   : 1440;
                            const vDays  = s.available_slots?.days ?? [];
                            if (form.lectureType === "oneday" && form.startDate && form.startTime && form.endTime) {
                              const dk = ["sun","mon","tue","wed","thu","fri","sat"][new Date(form.startDate + "T00:00:00").getDay()];
                              return vDays.includes(dk) && timeToMinutes(form.startTime) >= vStart && timeToMinutes(form.endTime) <= vEnd;
                            }
                            if (form.lectureType === "intensive" && form.startDate && form.startTime) {
                              const et = addHours(form.startTime, formLectureHours);
                              const rd = [...new Set(Array.from({ length: formSessionCount }, (_, i) => {
                                const d = new Date(new Date(form.startDate + "T00:00:00").getTime() + i * 86_400_000);
                                return ["sun","mon","tue","wed","thu","fri","sat"][d.getDay()];
                              }))];
                              return rd.every((d) => vDays.includes(d)) && timeToMinutes(form.startTime) >= vStart && timeToMinutes(et) <= vEnd;
                            }
                            if (form.lectureType === "longterm") {
                              return form.weekdaySlots.every((ws) => vDays.includes(ws.day));
                            }
                            return true;
                          });
                          if (visible.length > 0) return null;
                          const hint =
                            form.lectureType === "oneday" ? `선택한 날짜·시간에 운영하는 장소가 없습니다` :
                            form.lectureType === "intensive" ? `해당 기간·시간에 모두 운영하는 장소가 없습니다` :
                            `선택한 요일(${form.weekdaySlots.map((s) => DAY_LABELS[s.day]).join("·")})에 모두 운영하는 장소가 없습니다`;
                          return (
                            <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-3 text-center">{hint}</p>
                          );
                        })()}
                      </div>
                    </div>

                    {/* 회차별 일정 (장소 선택 시 표시) */}
                    {form.rentalVenueId && selectedVenue && (
                      <div>
                        {form.lectureType === "longterm" ? (
                          /* 장기형: 반복 요일·시간으로 자동 생성된 일정 미리보기 */
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-2">
                              대여 일정 (자동 생성)
                              <span className="font-normal text-gray-400 ml-1">
                                · {form.weekdaySlots.map((s) => DAY_LABELS[s.day]).join("·")}요일 반복 · 총 {formSessionCount}회
                              </span>
                            </label>
                            {longtermAutoSlots.length > 0 ? (
                              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
                                {longtermAutoSlots.map((slot, idx) => (
                                  <div key={idx} className="flex items-center gap-2 bg-white border border-purple-100 rounded-xl px-3 py-2">
                                    <span className="text-xs font-bold text-purple-500 w-10 flex-shrink-0">{idx + 1}회차</span>
                                    <span className="text-xs font-semibold text-gray-500 w-7 flex-shrink-0">{DAY_LABELS[slot.day]}</span>
                                    <span className="text-xs text-gray-700 flex-1">
                                      {new Date(slot.date + "T00:00:00").toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}
                                    </span>
                                    <span className="text-xs text-gray-500 flex-shrink-0">
                                      {slot.startTime && slot.endTime ? `${slot.startTime} ~ ${slot.endTime}` : "시간 미설정"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-3 text-center">
                                {!form.startDate
                                  ? "강의 시작일을 먼저 입력해주세요"
                                  : "진행 요일과 시간을 먼저 설정해주세요"}
                              </p>
                            )}
                          </div>
                        ) : form.lectureType === "intensive" ? (
                          /* 집중코스형: 연속 날짜 자동 생성 미리보기 */
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-2">
                              대여 일정 (자동 생성)
                              <span className="font-normal text-gray-400 ml-1">· 시작일부터 {formSessionCount}일 연속</span>
                            </label>
                            {intensiveAutoSlots.length > 0 ? (
                              <div className="space-y-1.5">
                                {intensiveAutoSlots.map((slot, idx) => (
                                  <div key={idx} className="flex items-center gap-2 bg-white border border-blue-100 rounded-xl px-3 py-2">
                                    <span className="text-xs font-bold text-blue-500 w-10 flex-shrink-0">{idx + 1}회차</span>
                                    <span className="text-xs font-semibold text-gray-500 w-7 flex-shrink-0">{DAY_LABELS[slot.day]}</span>
                                    <span className="text-xs text-gray-700 flex-1">
                                      {new Date(slot.date + "T00:00:00").toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}
                                    </span>
                                    <span className="text-xs text-gray-500 flex-shrink-0">
                                      {slot.startTime && slot.endTime ? `${slot.startTime} ~ ${slot.endTime}` : "시간 미설정"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-3 text-center">
                                {!form.startDate ? "강의 시작일을 먼저 입력해주세요" : "강의 시작 시간을 먼저 설정해주세요"}
                              </p>
                            )}
                          </div>
                        ) : form.lectureType === "oneday" ? (
                          /* 원데이형: 단일 일정 자동 표시 */
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-2">대여 일정</label>
                            {form.startDate && form.startTime && form.endTime ? (
                              <div className="flex items-center gap-2 bg-white border border-amber-100 rounded-xl px-3 py-2">
                                <span className="text-xs font-bold text-amber-500 w-10 flex-shrink-0">1회차</span>
                                <span className="text-xs font-semibold text-gray-500 w-7 flex-shrink-0">
                                  {DAY_LABELS[["sun","mon","tue","wed","thu","fri","sat"][new Date(form.startDate + "T00:00:00").getDay()]]}
                                </span>
                                <span className="text-xs text-gray-700 flex-1">
                                  {new Date(form.startDate + "T00:00:00").toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}
                                </span>
                                <span className="text-xs text-gray-500 flex-shrink-0">{form.startTime} ~ {form.endTime}</span>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-3 text-center">
                                날짜와 시간을 먼저 입력해주세요
                              </p>
                            )}
                          </div>
                        ) : null}
                      </div>
                    )}

                    {/* 노트북 대여 */}
                    {(() => {
                      const lp = rentalSettings.find((s) => s.id === "laptop");
                      if (!lp || !lp.available) return null;
                      const maxQty = lp.max_quantity ?? 30;
                      return (
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-2">
                            노트북 대여 수량
                            <span className="font-normal text-gray-400 ml-1">
                              (최대 {maxQty}대 · {formatKRW(lp.fee_per_use)}/{lp.fee_unit})
                            </span>
                          </label>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setForm((p) => ({ ...p, rentalEquipmentCount: String(Math.max(0, Number(p.rentalEquipmentCount) - 1)) }))}
                              disabled={Number(form.rentalEquipmentCount) <= 0}
                              className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 text-lg font-bold hover:bg-gray-100 active:scale-95 transition-all disabled:opacity-40"
                            >−</button>
                            <span className="text-sm font-bold text-hwaseong-text w-12 text-center">
                              {form.rentalEquipmentCount}대
                            </span>
                            <button
                              type="button"
                              onClick={() => setForm((p) => ({ ...p, rentalEquipmentCount: String(Math.min(maxQty, Number(p.rentalEquipmentCount) + 1)) }))}
                              className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 text-lg font-bold hover:bg-gray-100 active:scale-95 transition-all"
                            >+</button>
                            {Number(form.rentalEquipmentCount) > 0 && (
                              <span className="text-xs text-green-600 font-medium">✓ {form.rentalEquipmentCount}대 신청</span>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* 대여 관련 요청사항 */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">대여 관련 추가 요청사항</label>
                      <input
                        type="text"
                        value={form.rentalNotes}
                        onChange={(e) => setForm((p) => ({ ...p, rentalNotes: e.target.value }))}
                        placeholder="예: 설치 시간 30분 전 입장 필요, 특정 소프트웨어 설치 요청 등"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500/30"
                      />
                    </div>

                    <div className="bg-orange-50 border border-orange-200 rounded-xl px-3.5 py-3 text-xs text-orange-700 leading-relaxed">
                      ℹ️ 대여 비용은 현재 책정 중입니다. 신청 후 담당자가 개별적으로 안내드립니다.
                    </div>
                  </div>
                )}
              </div>

              <div className={form.lectureType ? "" : "grid grid-cols-2 gap-3"}>
                {!form.lectureType && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">희망 날짜</label>
                    {form.rentalVenueId && selectedVenue ? (
                      <div className="flex items-center gap-2 px-3 py-2.5 bg-green-50 border border-green-300 rounded-xl">
                        <span className="text-green-600 text-sm">📅</span>
                        <span className="text-sm text-green-800 font-medium flex-1">
                          {form.startDate
                            ? new Date(form.startDate + "T00:00:00").toLocaleDateString("ko-KR", { month: "long", day: "numeric" })
                            : "날짜 미선택"}
                        </span>
                        <span className="text-[10px] text-green-500 flex-shrink-0">1회차 자동 입력</span>
                      </div>
                    ) : (
                      <input
                        type="date" value={form.startDate}
                        onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" required
                      />
                    )}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">교육 장소</label>
                  {form.rentalVenueId && selectedVenue ? (
                    <div className="bg-green-50 border border-green-300 rounded-xl overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2.5">
                        <span className="text-green-600 text-sm">📍</span>
                        <span className="text-sm text-green-800 font-medium flex-1 truncate">{selectedVenue.address}</span>
                        <span className="text-[10px] text-green-500 flex-shrink-0">자동 입력됨</span>
                      </div>
                      {selectedVenue.available_slots && (
                        <div className="border-t border-green-200 px-3 py-1.5">
                          <span className="text-[11px] text-green-600">📅 {formatSlots(selectedVenue.available_slots)}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <input
                      type="text" value={form.address}
                      onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                      placeholder="동탄초 컴퓨터실" required
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30"
                    />
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">추가 요청사항</label>
                <textarea
                  rows={3} value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="특수 장비 필요 여부, 강의 요구사항 등"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 resize-none"
                />
              </div>

              <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
                🔒 강사의 실명과 연락처는 매칭 확정 이후에만 공개됩니다. (안심매칭)
              </div>

              {/* 예상 비용 요약 */}
              <div className="border border-emerald-200 rounded-xl overflow-hidden">
                <div className="bg-emerald-50 px-4 py-3 flex items-center justify-between">
                  <p className="text-xs text-emerald-600 font-semibold">강사비</p>
                  <div className="text-right">
                    <p className="text-lg font-black text-emerald-800 leading-none">{formatKRW(instructorFee)}</p>
                    <p className="text-[11px] text-emerald-500 mt-0.5">{form.sessionCount}회 × 30,000원/회</p>
                  </div>
                </div>
                {form.rentalEnabled && selectedVenue && (
                  <div className="bg-orange-50 border-t border-emerald-100 px-4 py-2.5 flex items-center justify-between">
                    <p className="text-xs text-orange-600 font-semibold">공간 대여</p>
                    <div className="text-right">
                      <p className="text-sm font-bold text-orange-700">{formatKRW(venueFee)}</p>
                      <p className="text-[11px] text-orange-400">{form.sessionCount}회 × {formatHours(formLectureHours)} × {formatKRW(selectedVenue.fee_per_use)}/시간</p>
                    </div>
                  </div>
                )}
                {form.rentalEnabled && Number(form.rentalEquipmentCount) > 0 && laptopSetting && (
                  <div className="bg-orange-50 border-t border-orange-100 px-4 py-2.5 flex items-center justify-between">
                    <p className="text-xs text-orange-600 font-semibold">노트북 대여</p>
                    <div className="text-right">
                      <p className="text-sm font-bold text-orange-700">{formatKRW(equipmentFee)}</p>
                      <p className="text-[11px] text-orange-400">{form.rentalEquipmentCount}대 × {formatHours(formLectureHours)} × {formatKRW(laptopSetting.fee_per_use)}/대·시간 × {form.sessionCount}회</p>
                    </div>
                  </div>
                )}
                <div className="bg-emerald-100 border-t border-emerald-200 px-4 py-3 flex items-center justify-between">
                  <p className="text-sm font-bold text-emerald-900">예상 합계</p>
                  <p className="text-xl font-black text-emerald-900">{formatKRW(grandTotal)}</p>
                </div>
              </div>

              {/* 신청 내역 요약 */}
              {(form.institutionName || form.lectureType || form.title) && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 space-y-2">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">신청 내역 요약</p>
                  <p className="text-sm font-semibold text-hwaseong-text leading-snug">
                    {[
                      form.institutionName || "기관명 미입력",
                      selectedType ? `${selectedType.emoji} ${selectedType.name}` : "유형 미선택",
                      `총 ${formatHours(formLectureHours * formSessionCount)} (${form.sessionCount}회 × ${formatHours(formLectureHours)})`,
                      formatKRW(grandTotal),
                    ].join("  ·  ")}
                  </p>
                  {form.lectureType === "longterm" && form.weekdaySlots.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {form.weekdaySlots.map((slot) => {
                        const dayLabel = WEEKDAYS.find((d) => d.key === slot.day)?.label ?? slot.day;
                        return (
                          <span key={slot.day} className="text-[11px] bg-purple-50 text-purple-700 px-2 py-1 rounded-lg font-medium">
                            {dayLabel}
                            {slot.startTime && slot.endTime
                              ? ` ${slot.startTime}~${slot.endTime}`
                              : " 시간 미설정"}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>}

              <button
                type="submit" disabled={submitting}
                className="w-full py-3 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-60"
              >
                {submitting ? "제출 중..." : "매칭 요청 제출"}
              </button>
            </form>
            </div>
          </div>
        )}

      </DashboardLayout>
    </>
  );
}

function maskName(name: string): string {
  if (name.length <= 1) return "*";
  if (name.length === 2) return name[0] + "*";
  return name[0] + "*".repeat(name.length - 2) + name[name.length - 1];
}

function AudiencePicker({
  selected,
  customValue,
  onToggle,
  onCustomChange,
}: {
  selected: string[];
  customValue: string;
  onToggle: (val: string) => void;
  onCustomChange: (val: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-gray-600">교육 대상</label>
        <span className="text-[11px] text-gray-400">복수 선택 가능</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {TARGET_AUDIENCE_OPTIONS.map((opt) => {
          const isSelected = selected.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onToggle(opt.value)}
              className={`relative flex flex-col items-center gap-1 rounded-2xl border-2 py-3.5 px-2 transition-all duration-150 select-none ${
                isSelected
                  ? "border-hwaseong-blue bg-hwaseong-blue text-white shadow-lg shadow-hwaseong-blue/20"
                  : "border-gray-200 bg-gray-50 text-gray-600 hover:border-hwaseong-blue/40 hover:bg-hwaseong-light"
              }`}
            >
              {isSelected && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-white/25 rounded-full flex items-center justify-center">
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              )}
              <opt.Icon
                size={22}
                className={isSelected ? "text-white" : opt.iconColor}
                strokeWidth={1.8}
              />
              <span className={`text-[11px] font-bold leading-tight text-center ${isSelected ? "text-white" : "text-gray-700"}`}>
                {opt.line1}
              </span>
              {opt.line2 && (
                <span className={`text-[10px] leading-tight text-center ${isSelected ? "text-white/80" : "text-gray-400"}`}>
                  {opt.line2}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selected.includes("기타(직접 입력)") && (
        <div className="mt-3 relative">
          <PenLine size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-hwaseong-blue/60" />
          <input
            type="text"
            value={customValue}
            onChange={(e) => onCustomChange(e.target.value)}
            placeholder="예: 다문화 가정, 발달 장애인, 새터민 등"
            className="w-full pl-8 pr-3 py-2.5 border-2 border-hwaseong-blue/30 bg-hwaseong-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/20 focus:border-hwaseong-blue/50 placeholder:text-gray-400"
            autoFocus
          />
        </div>
      )}

      {selected.length > 0 && (
        <p className="mt-2 text-[11px] text-hwaseong-blue font-medium">
          선택됨: {selected.map((v) => v === "기타(직접 입력)" ? (customValue.trim() || "기타") : v).join(", ")}
        </p>
      )}
    </div>
  );
}
