import Head from "next/head";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/lib/auth-context";
import DashboardLayout from "@/components/DashboardLayout";
import Link from "next/link";

// ─── 타입 ──────────────────────────────────────────────────────────────────

type MatchRequest = {
  id: string;
  title: string;
  category: string;
  target_age: string | null;
  participant_count: number;
  start_date: string;
  address: string | null;
  status: string;
  is_approved?: boolean;
  created_at?: string;
  updated_at?: string;
  client: { name: string; email: string } | null;
  leader: { maskedName: string; realName?: string } | null;
};

// ─── 상수 ──────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; icon: string; bg: string; text: string; border: string }> = {
  all:       { label: "전체",       icon: "📋", bg: "bg-gray-100",    text: "text-gray-700",   border: "border-gray-300" },
  pending:   { label: "검토 대기",  icon: "📥", bg: "bg-amber-50",    text: "text-amber-700",  border: "border-amber-300" },
  matched:   { label: "배정됨",     icon: "🔗", bg: "bg-blue-50",     text: "text-blue-700",   border: "border-blue-300" },
  ongoing:   { label: "진행 중",    icon: "▶️", bg: "bg-green-50",    text: "text-green-700",  border: "border-green-300" },
  completed: { label: "완료",       icon: "✅", bg: "bg-teal-50",     text: "text-teal-700",   border: "border-teal-300" },
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
    r.client?.name, r.leader?.realName ?? r.leader?.maskedName ?? "",
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

        {/* 상태별 카운트 카드 */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {(["all", "pending", "matched", "ongoing", "completed", "rejected", "cancelled"] as const).map((s) => {
            const m = STATUS_META[s];
            const count = counts[s] ?? 0;
            const active = statusFilter === s;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-2xl p-3 text-center border-2 transition-all ${
                  active ? `${m.bg} ${m.border} shadow-sm` : "bg-white border-gray-100 hover:border-gray-200"
                }`}
              >
                <p className="text-base mb-0.5">{m.icon}</p>
                <p className={`text-xl font-black leading-none ${active ? m.text : "text-hwaseong-text"}`}>{count}</p>
                <p className={`text-[10px] mt-0.5 font-semibold leading-tight ${active ? m.text : "text-gray-400"}`}>{m.label}</p>
              </button>
            );
          })}
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
                  className={`bg-white rounded-2xl px-5 py-4 border shadow-sm transition-colors hover:shadow-md ${
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
                        <p className="font-semibold text-hwaseong-text text-sm truncate">{req.title}</p>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 mt-1">
                        <span>🏢 {req.client?.name ?? "—"}</span>
                        {req.address && <span>📍 {req.address}</span>}
                        <span>📅 {req.start_date}</span>
                        <span>👥 {req.participant_count}명</span>
                        <span>🎯 {req.category}</span>
                        {req.leader && (
                          <span className="text-blue-500 font-medium">
                            🏅 {req.leader.realName ?? req.leader.maskedName}
                          </span>
                        )}
                      </div>
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
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
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
    </>
  );
}
