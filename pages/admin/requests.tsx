import Head from "next/head";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/lib/auth-context";
import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";

// ─── 타입 ──────────────────────────────────────────────────────────────────

type LectureTimeSlot = {
  type?: string; day?: string;
  start?: string; startTime?: string;
  end?: string; endTime?: string;
  date?: string;
};

type MatchRequest = {
  id: string;
  title: string;
  category: string;
  lecture_type: "oneday" | "intensive" | "longterm" | null;
  lecture_times: LectureTimeSlot[] | null;
  lecture_hours: number | null;
  target_age: string | null;
  target_audience: string[] | null;
  participant_count: number;
  session_count: number | null;
  start_date: string;
  end_date: string | null;
  address: string | null;
  location_type: string | null;
  institution_type: string | null;
  notes: string | null;
  status: string;
  is_approved?: boolean;
  created_at?: string;
  updated_at?: string;
  needs_venue?: boolean;
  rental_venue_id?: string | null;
  needs_equipment?: boolean;
  rental_equipment_count?: number;
  rental_notes?: string | null;
  client: { name: string; email: string } | null;
  leader: {
    id: string;
    is_verified: boolean;
    rating_avg: number | null;
    specialties: string[];
    profiles: { name: string } | null;
  } | null;
};

const DAY_LABELS: Record<string, string> = {
  mon: "월", tue: "화", wed: "수", thu: "목", fri: "금", sat: "토", sun: "일",
};

const LECTURE_TYPE_META: Record<string, { emoji: string; label: string; bg: string; text: string }> = {
  oneday:    { emoji: "⚡", label: "원데이형",   bg: "bg-amber-50",  text: "text-amber-700"  },
  intensive: { emoji: "📚", label: "집중코스형", bg: "bg-blue-50",   text: "text-blue-700"   },
  longterm:  { emoji: "📅", label: "장기정기형", bg: "bg-purple-50", text: "text-purple-700" },
};

// ─── 상수 ──────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; icon: string; bg: string; text: string; border: string }> = {
  all:       { label: "전체",       icon: "📋", bg: "bg-gray-100",    text: "text-gray-700",   border: "border-gray-300" },
  pending:   { label: "검토중",          icon: "📥", bg: "bg-amber-50",    text: "text-amber-700",  border: "border-amber-300" },
  matched:   { label: "강사 수락 대기",  icon: "🔗", bg: "bg-blue-50",     text: "text-blue-700",   border: "border-blue-300" },
  ongoing:   { label: "강의 진행중",     icon: "▶️", bg: "bg-green-50",    text: "text-green-700",  border: "border-green-300" },
  completed: { label: "완료",            icon: "✅", bg: "bg-teal-50",     text: "text-teal-700",   border: "border-teal-300" },
  rejected:  { label: "재배정 필요", icon: "⚠️", bg: "bg-red-50",     text: "text-red-700",    border: "border-red-300" },
  cancelled: { label: "취소",       icon: "✕",  bg: "bg-gray-50",    text: "text-gray-500",   border: "border-gray-200" },
};

const SORT_OPTIONS = [
  { value: "created_desc", label: "최신 등록순" },
  { value: "created_asc",  label: "오래된 순" },
  { value: "start_asc",    label: "강의 일자 빠른 순" },
  { value: "start_desc",   label: "강의 일자 늦은 순" },
];

// ─── 헬퍼 ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ko-KR", { year: "2-digit", month: "2-digit", day: "2-digit" });
}

function exportCSV(rows: MatchRequest[]) {
  const headers = ["번호","강의 제목","카테고리","수요처","강사","상태","강의 일자","참여 인원","주소","등록일"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const body = rows.map((r, i) => [
    i + 1, r.title, r.category,
    r.client?.name, r.leader?.profiles?.name ?? "",
    STATUS_META[r.status]?.label ?? r.status,
    r.start_date, r.participant_count, r.address, fmtDate(r.created_at),
  ].map(esc).join(",")).join("\n");
  const csv = "﻿" + headers.map(esc).join(",") + "\n" + body;
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" })),
    download: `요청목록_${new Date().toISOString().slice(0, 10)}.csv`,
  });
  a.click();
}

// ─── 메인 ──────────────────────────────────────────────────────────────────

export default function AdminRequestsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [requests, setRequests] = useState<MatchRequest[]>([]);
  const [fetching, setFetching] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("created_desc");
  const [selected, setSelected] = useState<MatchRequest | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    setFetching(true);
    fetch("/api/match-requests")
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setRequests(d); })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [user]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: requests.length };
    requests.forEach((r) => { c[r.status] = (c[r.status] ?? 0) + 1; });
    return c;
  }, [requests]);

  const filtered = useMemo(() => {
    let list = requests;
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          (r.client?.name ?? "").toLowerCase().includes(q) ||
          (r.address ?? "").toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (sort === "created_desc") return (b.created_at ?? "").localeCompare(a.created_at ?? "");
      if (sort === "created_asc")  return (a.created_at ?? "").localeCompare(b.created_at ?? "");
      if (sort === "start_asc")    return a.start_date.localeCompare(b.start_date);
      if (sort === "start_desc")   return b.start_date.localeCompare(a.start_date);
      return 0;
    });
  }, [requests, statusFilter, search, sort]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-hwaseong-blue border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <>
      <Head><title>전체 요청 현황 | 화성 AI 시민리더 잇다</title></Head>
      <DashboardLayout pageTitle="전체 요청 현황">

        {/* 헤더 */}
        <div className="bg-gradient-to-br from-slate-700 to-slate-900 rounded-3xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">📋</div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-black text-white">전체 요청 현황</h2>
            <p className="text-slate-300 text-xs mt-0.5">교육 요청의 전체 파이프라인을 한눈에 확인합니다.</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => { setFetching(true); fetch("/api/match-requests").then(r => r.json()).then(d => { if (Array.isArray(d)) setRequests(d); }).finally(() => setFetching(false)); }}
              disabled={fetching}
              className="text-xs bg-white/10 border border-white/30 text-white px-3 py-1.5 rounded-xl hover:bg-white/20 transition-colors disabled:opacity-50"
            >
              {fetching ? "로딩..." : "↺ 새로고침"}
            </button>
            <button
              onClick={() => exportCSV(filtered)}
              className="text-xs bg-emerald-500 text-white px-3 py-1.5 rounded-xl hover:bg-emerald-600 transition-colors"
            >
              📊 CSV
            </button>
          </div>
        </div>

        {/* 단계별 필터 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          {/* 전체 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStatusFilter("all")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${
                statusFilter === "all"
                  ? "bg-gray-100 border-gray-300 text-gray-700"
                  : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
              }`}
            >
              <span>📋</span>
              <span>전체</span>
              <span className={`text-xs font-black ${statusFilter === "all" ? "text-gray-700" : "text-gray-400"}`}>
                {counts.all ?? 0}
              </span>
            </button>
          </div>

          {/* 진행 파이프라인 */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 mb-2 tracking-wide uppercase">진행 단계</p>
            <div className="flex items-center gap-1 flex-wrap">
              {(["pending", "matched", "ongoing", "completed"] as const).map((s, i) => {
                const m = STATUS_META[s];
                const count = counts[s] ?? 0;
                const active = statusFilter === s;
                return (
                  <div key={s} className="flex items-center gap-1">
                    {i > 0 && <span className="text-gray-300 text-xs flex-shrink-0">→</span>}
                    <button
                      onClick={() => setStatusFilter(s)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${
                        active
                          ? `${m.bg} ${m.border} ${m.text}`
                          : "bg-white border-gray-100 text-gray-500 hover:border-gray-200"
                      }`}
                    >
                      <span>{m.icon}</span>
                      <span>{m.label}</span>
                      <span className={`text-xs font-black ${active ? m.text : "text-gray-400"}`}>{count}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 예외 상태 */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 mb-2 tracking-wide uppercase">예외 상태</p>
            <div className="flex items-center gap-2">
              {(["rejected", "cancelled"] as const).map((s) => {
                const m = STATUS_META[s];
                const count = counts[s] ?? 0;
                const active = statusFilter === s;
                return (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${
                      active
                        ? `${m.bg} ${m.border} ${m.text}`
                        : "bg-white border-gray-100 text-gray-500 hover:border-gray-200"
                    }`}
                  >
                    <span>{m.icon}</span>
                    <span>{m.label}</span>
                    <span className={`text-xs font-black ${active ? m.text : "text-gray-400"}`}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 검색 + 정렬 */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="강의 제목, 수요처, 주소, 카테고리 검색"
              className="w-full pl-9 pr-9 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 text-sm">✕</button>
            )}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30 bg-white text-gray-700 flex-shrink-0"
          >
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* 결과 수 */}
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-gray-400">
            {statusFilter !== "all" || search ? `${filtered.length}건 검색됨` : `전체 ${requests.length}건`}
          </p>
          {(statusFilter !== "all" || search) && (
            <button onClick={() => { setStatusFilter("all"); setSearch(""); }} className="text-xs text-hwaseong-blue hover:underline">
              필터 초기화
            </button>
          )}
        </div>

        {/* 목록 */}
        {fetching ? (
          <div className="flex items-center justify-center py-16 text-gray-300">
            <div className="w-6 h-6 border-3 border-gray-200 border-t-hwaseong-blue rounded-full animate-spin mr-3" />
            로딩 중...
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 text-gray-400">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-sm">해당하는 요청이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((req) => {
              const meta = STATUS_META[req.status];
              const isPending   = req.status === "pending";
              const isRejected  = req.status === "rejected";
              const isCompleted = req.status === "completed";
              const isMatched   = req.status === "matched";
              return (
                <div
                  key={req.id}
                  onClick={() => setSelected(req)}
                  className={`bg-white rounded-2xl px-5 py-4 border shadow-sm transition-all cursor-pointer hover:shadow-md hover:-translate-y-px ${
                    isRejected ? "border-red-200" : isPending ? "border-amber-100" : "border-gray-100"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* 상태 아이콘 */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 mt-0.5 ${meta?.bg ?? "bg-gray-50"}`}>
                      {meta?.icon ?? "📋"}
                    </div>

                    {/* 내용 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta?.bg ?? "bg-gray-100"} ${meta?.text ?? "text-gray-600"}`}>
                          {meta?.label ?? req.status}
                        </span>
                        {req.lecture_type && LECTURE_TYPE_META[req.lecture_type] && (() => {
                          const lt = LECTURE_TYPE_META[req.lecture_type!]!;
                          return (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${lt.bg} ${lt.text}`}>
                              {lt.emoji} {lt.label}
                            </span>
                          );
                        })()}
                        <p className="font-semibold text-hwaseong-text text-sm truncate">{req.title}</p>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 mt-1">
                        <span>🏢 {req.client?.name ?? "—"}</span>
                        {req.address && <span>📍 {req.address}</span>}
                        <span>📅 {req.start_date}</span>
                        <span>👥 {req.participant_count}명</span>
                        <span>🎯 {req.category}</span>
                        {req.session_count != null && req.session_count > 1 && (
                          <span>🔁 {req.session_count}회차</span>
                        )}
                        {req.leader && (
                          <span className="text-blue-500 font-medium">
                            🏅 {req.leader.profiles?.name ?? "—"}
                          </span>
                        )}
                      </div>
                      {req.lecture_type === "longterm" && req.lecture_times && req.lecture_times.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {req.lecture_times.filter((s) => s.type === "recurring" && s.day).map((s) => (
                            <span key={s.day} className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-medium">
                              {DAY_LABELS[s.day!] ?? s.day} {s.start}~{s.end}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-gray-300">등록 {fmtDate(req.created_at)}</span>
                        {isRejected && (
                          <span className="text-[10px] text-red-500 font-semibold animate-pulse">⚠️ 재배정 필요</span>
                        )}
                        {isPending && req.is_approved === false && (
                          <span className="text-[10px] text-amber-600 font-semibold">검토 전</span>
                        )}
                      </div>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="flex flex-col gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      {(isPending || isRejected) && (
                        <Link href="/admin/matching-center"
                          className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-hwaseong-blue text-white hover:bg-blue-900 transition-colors text-center">
                          🎯 매칭센터
                        </Link>
                      )}
                      {isPending && req.is_approved === false && (
                        <Link href="/admin/review"
                          className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition-colors text-center">
                          🔍 검토
                        </Link>
                      )}
                      {isMatched && (
                        <span className="text-[11px] text-sky-600 font-semibold px-3 py-1.5 bg-sky-50 rounded-xl text-center">
                          ⏳ 수락 대기
                        </span>
                      )}
                      {isCompleted && (
                        <Link href="/admin/settlement"
                          className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-colors text-center">
                          💰 정산
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </DashboardLayout>

      {selected && (
        <RequestDetailPanel req={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}

// ─── 상세 패널 ────────────────────────────────────────────────────────────────

const DAY_KR: Record<string, string> = {
  mon: "월", tue: "화", wed: "수", thu: "목", fri: "금", sat: "토", sun: "일",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">{title}</p>
      <div className="bg-gray-50 rounded-2xl px-4 py-3 space-y-2">{children}</div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: string; label: string; value: React.ReactNode }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-2">
      <span className="text-sm flex-shrink-0 mt-px">{icon}</span>
      <span className="text-xs text-gray-400 w-20 flex-shrink-0 mt-px">{label}</span>
      <span className="text-xs font-semibold text-hwaseong-text flex-1 leading-relaxed">{value}</span>
    </div>
  );
}

function RequestDetailPanel({ req, onClose }: { req: MatchRequest; onClose: () => void }) {
  const meta = STATUS_META[req.status];
  const ltMeta = req.lecture_type ? LECTURE_TYPE_META[req.lecture_type] : null;
  const leaderName = req.leader?.profiles?.name;

  const slots = req.lecture_times ?? [];

  // 장기정기형: 날짜 기준 정렬된 회차 목록
  const sessionSlots = slots.filter((s) => s.date).sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  // 집중코스형도 날짜별로 표시
  const hasDateSlots = sessionSlots.length > 0;

  return (
    <>
      {/* 백드롭 */}
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

      {/* 패널 */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-white shadow-2xl flex flex-col">

        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${meta?.bg} ${meta?.text}`}>
              {meta?.icon} {meta?.label ?? req.status}
            </span>
            {ltMeta && (
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${ltMeta.bg} ${ltMeta.text}`}>
                {ltMeta.emoji} {ltMeta.label}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 text-lg"
          >
            ✕
          </button>
        </div>

        {/* 내용 */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* 제목 */}
          <div>
            <h3 className="font-black text-hwaseong-text text-base leading-snug">{req.title}</h3>
            {req.created_at && (
              <p className="text-[10px] text-gray-400 mt-1">등록 {fmtDate(req.created_at)}</p>
            )}
          </div>

          {/* 강의 기본 정보 */}
          <Section title="강의 정보">
            <Row icon="📁" label="분야" value={req.category} />
            <Row icon="🏫" label="기관 유형" value={req.institution_type} />
            <Row icon="👤" label="대상" value={req.target_audience?.join(", ")} />
            <Row icon="👥" label="참여 인원" value={`${req.participant_count}명`} />
            <Row icon="🔁" label="회차" value={req.session_count && req.session_count > 1 ? `총 ${req.session_count}회` : undefined} />
            <Row icon="⏱" label="회당 시간" value={req.lecture_hours ? `${req.lecture_hours}시간` : undefined} />
          </Section>

          {/* 일정 */}
          <Section title="일정">
            <Row icon="📅" label="시작일" value={req.start_date} />
            {req.end_date && req.end_date !== req.start_date && (
              <Row icon="🏁" label="종료일" value={req.end_date} />
            )}
            {hasDateSlots ? (
              <div className="pt-1">
                <p className="text-[10px] text-gray-400 mb-1.5">회차별 일정</p>
                <div className="space-y-1.5">
                  {sessionSlots.map((s, i) => {
                    const day = s.day ? (DAY_KR[s.day] ?? s.day) : "";
                    const start = s.startTime ?? s.start ?? "";
                    const end = s.endTime ?? s.end ?? "";
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-400 w-8 flex-shrink-0">
                          {i + 1}회
                        </span>
                        <span className="text-xs font-semibold text-hwaseong-text">
                          {s.date}
                          {day && ` (${day})`}
                          {start && ` ${start}${end ? ` ~ ${end}` : ""}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </Section>

          {/* 장소 */}
          <Section title="장소">
            <Row icon="📍" label="주소" value={req.address} />
            <Row icon="🏢" label="방식" value={req.location_type === "offline" ? "오프라인" : req.location_type === "online" ? "온라인" : req.location_type} />
            {req.needs_venue && (
              <Row icon="🏛" label="공간 대여" value={req.rental_venue_id ?? "신청됨"} />
            )}
            {req.needs_equipment && req.rental_equipment_count && req.rental_equipment_count > 0 && (
              <Row icon="💻" label="장비 대여" value={`${req.rental_equipment_count}대`} />
            )}
            {req.rental_notes && (
              <Row icon="📝" label="대여 메모" value={req.rental_notes} />
            )}
          </Section>

          {/* 수요처 */}
          <Section title="수요처">
            <Row icon="🏢" label="기관명" value={req.client?.name} />
            <Row icon="📧" label="이메일" value={req.client?.email} />
          </Section>

          {/* 배정 강사 */}
          <Section title="배정 강사">
            {leaderName ? (
              <>
                <Row icon="🎤" label="강사명" value={leaderName} />
                {req.leader?.rating_avg != null && (
                  <Row icon="⭐" label="평점" value={`${req.leader.rating_avg} / 5`} />
                )}
                {req.leader?.is_verified && (
                  <Row icon="✅" label="인증" value="화성특례시 공식 인증 강사" />
                )}
                {req.leader?.specialties && req.leader.specialties.length > 0 && (
                  <Row icon="📚" label="전문 분야" value={req.leader.specialties.join(", ")} />
                )}
              </>
            ) : (
              <p className="text-xs text-gray-400">아직 배정된 강사가 없습니다.</p>
            )}
          </Section>

          {/* 요청 메모 */}
          {req.notes && (
            <Section title="수요처 요청사항">
              <p className="text-xs text-gray-700 leading-relaxed">{req.notes}</p>
            </Section>
          )}
        </div>

        {/* 푸터 액션 */}
        <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0 flex flex-col gap-2">
          {(req.status === "pending" || req.status === "rejected") && (
            <Link
              href="/admin/matching-center"
              className="w-full flex items-center justify-center gap-2 py-3 bg-hwaseong-blue text-white text-sm font-bold rounded-xl hover:bg-blue-900 transition-colors"
            >
              🎯 매칭 센터에서 처리
            </Link>
          )}
          {req.status === "pending" && req.is_approved === false && (
            <Link
              href="/admin/review"
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 transition-colors"
            >
              🔍 요청 검토
            </Link>
          )}
          {req.status === "completed" && (
            <Link
              href="/admin/settlement"
              className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors"
            >
              💰 정산 처리
            </Link>
          )}
          <button
            onClick={onClose}
            className="w-full py-2.5 border border-gray-200 text-gray-500 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </>
  );
}
