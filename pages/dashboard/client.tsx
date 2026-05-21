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

type MatchRequest = {
  id: string;
  title: string;
  category: string;
  /** 강사 매칭 시 강사의 전문 분야와 대조하는 핵심 파라미터로 사용됨 */
  target_audience: string[] | null;
  participant_count: number;
  start_date: string;
  address: string | null;
  notes: string | null;
  status: string;
  leader: Leader | null;
};

const STATUS_MAP: Record<string, { label: string; cls: string; icon: string; desc: string }> = {
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

type ReviewState = { reportId: string; rating: number };

export default function ClientDashboard() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [requests, setRequests] = useState<MatchRequest[]>([]);
  const [form, setForm] = useState({
    title: "", category: "",
    targetAudience: [] as string[],
    customAudience: "",
    participantCount: "20", startDate: "", address: "", notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [reviewState, setReviewState] = useState<ReviewState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== "client")) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/match-requests").then((r) => r.json()).then(setRequests).catch(() => {});
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
          title: form.title,
          category: form.category,
          targetAudience: audience,
          participantCount: Number(form.participantCount),
          startDate: form.startDate,
          address: form.address,
          notes: form.notes,
        }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      const updated = await fetch("/api/match-requests").then((r) => r.json());
      setRequests(updated);
      setShowForm(false);
      setForm({ title: "", category: "", targetAudience: [], customAudience: "", participantCount: "20", startDate: "", address: "", notes: "" });
    } finally {
      setSubmitting(false);
    }
  }

  async function submitRating(reportId: string, rating: number) {
    await fetch(`/api/activity-reports/${reportId}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating }),
    });
    setReviewState(null);
  }

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-hwaseong-blue border-t-transparent rounded-full animate-spin" /></div>;
  }

  const pending = requests.filter((r) => r.status === "pending").length;
  const matched = requests.filter((r) => ["matched", "ongoing"].includes(r.status)).length;
  const completed = requests.filter((r) => r.status === "completed").length;

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
              <h2 className="text-xl font-black text-white">{user.name}</h2>
              <p className="text-green-100 text-sm">교육 수요처</p>
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
        </div>

        {/* 목록 헤더 */}
        {!showForm && (
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-hwaseong-text text-sm">매칭 요청 현황</p>
              <p className="text-xs text-gray-400 mt-0.5">총 {requests.length}건</p>
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
            {requests.length === 0 && (
              <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
                <p className="text-5xl mb-4">📋</p>
                <p className="font-bold text-gray-500 mb-1">아직 매칭 요청이 없습니다</p>
                <p className="text-xs text-gray-400 mb-6">강의 요청을 등록하면 최적의 강사를 매칭해 드립니다.</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="px-8 py-3 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 transition-colors"
                >
                  첫 매칭 요청하기
                </button>
              </div>
            )}
            {requests.map((req) => {
              const st = STATUS_MAP[req.status] ?? { label: req.status, cls: "bg-gray-100 text-gray-500", icon: "", desc: "" };
              const isRevealed = ["matched", "ongoing", "completed"].includes(req.status);
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
                      <span className="bg-gray-50 px-2 py-1 rounded-lg">🎯 {req.category}</span>
                      <span className="bg-gray-50 px-2 py-1 rounded-lg">👥 {req.participant_count}명</span>
                      {req.target_audience && req.target_audience.slice(0, 2).map((a) => (
                        <span key={a} className="bg-blue-50 text-blue-600 px-2 py-1 rounded-lg">{a}</span>
                      ))}
                      {(req.target_audience?.length ?? 0) > 2 && (
                        <span className="text-gray-400 px-1 py-1">+{(req.target_audience?.length ?? 0) - 2}</span>
                      )}
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

                      {/* 평점 작성 (완료 후) */}
                      {req.status === "completed" && (
                        <div>
                          {reviewState?.reportId === req.id ? (
                            <div className="flex items-center gap-3">
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((v) => (
                                  <button
                                    key={v}
                                    onClick={() => setReviewState((p) => p ? { ...p, rating: v } : p)}
                                    className={`text-xl transition-colors ${(reviewState?.rating ?? 0) >= v ? "text-amber-400" : "text-gray-200"}`}
                                  >★</button>
                                ))}
                              </div>
                              <button
                                onClick={() => submitRating(reviewState.reportId, reviewState.rating)}
                                className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700"
                              >제출</button>
                              <button
                                onClick={() => setReviewState(null)}
                                className="text-xs text-gray-400 px-3 py-1.5 rounded-lg hover:bg-gray-100"
                              >취소</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setReviewState({ reportId: req.id, rating: 5 })}
                              className="w-full py-2.5 border border-green-200 text-green-700 text-xs font-bold rounded-xl hover:bg-green-50 transition-colors"
                            >
                              ⭐ 만족도 평점 작성하기
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">희망 날짜</label>
                  <input
                    type="date" value={form.startDate}
                    onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">교육 장소</label>
                  <input
                    type="text" value={form.address}
                    onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                    placeholder="동탄초 컴퓨터실" required
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30"
                  />
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
