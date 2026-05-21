import Head from "next/head";
import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/lib/auth-context";
import DashboardLayout from "@/components/DashboardLayout";

// ─── 타입 ──────────────────────────────────────────────────────────────────

type SettlementReport = {
  id: string;
  attendance_count: number;
  image_urls: string[];
  report_text: string | null;
  rating_from_client: number | null;
  submitted_at: string;
  lecture_date: string | null;
  admin_approved_at: string | null;
  admin_approved_by: string | null;
  admin_note: string | null;
  match: {
    id: string;
    title: string;
    category: string;
    address: string | null;
    start_date: string;
    participant_count: number;
    frequency: string;
    location_type: string;
    leader: {
      id: string;
      profiles: { name: string; email: string } | null;
    } | null;
    client: { name: string; email: string } | null;
  } | null;
};

// ─── 상수 ──────────────────────────────────────────────────────────────────

const LOC_LABELS:  Record<string, string> = { offline: "대면", online: "온라인", hybrid: "혼합" };
const FREQ_LABELS: Record<string, string> = { single: "1회성", regular: "정기" };

// ─── 헬퍼 ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function StarRating({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-gray-300">미평가</span>;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} className={`w-3.5 h-3.5 ${i <= Math.round(value) ? "text-amber-400" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="text-xs font-bold text-amber-600 ml-1">{Number(value).toFixed(1)}</span>
    </div>
  );
}

// ─── CSV 내보내기 ──────────────────────────────────────────────────────────

function exportCSV(rows: SettlementReport[]) {
  const headers = [
    "번호", "강의 제목", "카테고리", "강사명", "수요처명",
    "강의 일자", "실제 참석 인원", "만족도 평점",
    "승인 여부", "승인 일시", "주소", "강의 형태",
  ];
  const escape = (v: string | number | null | undefined) => {
    const s = String(v ?? "").replace(/"/g, '""');
    return `"${s}"`;
  };
  const body = rows.map((r, i) => [
    i + 1,
    r.match?.title,
    r.match?.category,
    r.match?.leader?.profiles?.name,
    r.match?.client?.name,
    r.lecture_date ?? r.match?.start_date,
    r.attendance_count,
    r.rating_from_client ?? "미평가",
    r.admin_approved_at ? "승인완료" : "미승인",
    r.admin_approved_at ? fmtDateTime(r.admin_approved_at) : "",
    r.match?.address,
    r.match?.location_type ? LOC_LABELS[r.match.location_type] ?? r.match.location_type : "",
  ].map(escape).join(",")).join("\n");

  const csv = "﻿" + headers.map(escape).join(",") + "\n" + body;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `정산목록_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── 강의확인서 인쇄용 컴포넌트 ───────────────────────────────────────────

function LectureCertificate({ report }: { report: SettlementReport }) {
  const m = report.match;
  const leaderName  = m?.leader?.profiles?.name ?? "—";
  const clientName  = m?.client?.name ?? "—";
  const lectureDate = fmtDate(report.lecture_date ?? m?.start_date);
  const today       = fmtDate(new Date().toISOString());

  return (
    <div id="certificate-print" className="bg-white p-12 font-serif text-gray-900" style={{ width: "210mm", minHeight: "297mm" }}>
      {/* 헤더 */}
      <div className="text-center mb-10">
        <p className="text-sm text-gray-500 mb-2">화성특례시</p>
        <h1 className="text-3xl font-black tracking-widest border-b-4 border-gray-900 pb-4 inline-block px-8">
          강 의 확 인 서
        </h1>
      </div>

      {/* 공문 번호·발행일 */}
      <div className="flex justify-between text-sm text-gray-500 mb-8">
        <span>문서번호: 화성AI잇다-{report.id.slice(0, 8).toUpperCase()}</span>
        <span>발행일: {today}</span>
      </div>

      {/* 수신 */}
      <table className="w-full border-collapse text-sm mb-8">
        <tbody>
          {[
            ["수  신", clientName],
            ["강의 제목", m?.title ?? "—"],
            ["카테고리", m?.category ?? "—"],
            ["강  사", leaderName],
            ["강의 일자", lectureDate],
            ["강의 장소", m?.address ?? "—"],
            ["강의 형태", m?.location_type ? (LOC_LABELS[m.location_type] ?? m.location_type) : "—"],
            ["참 석 인 원", `${report.attendance_count}명`],
            ["만족도 평점", report.rating_from_client !== null ? `${Number(report.rating_from_client).toFixed(1)} / 5.0` : "미평가"],
          ].map(([label, value]) => (
            <tr key={label} className="border border-gray-400">
              <td className="bg-gray-100 font-bold px-4 py-2.5 w-32 border-r border-gray-400">{label}</td>
              <td className="px-4 py-2.5">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 강의 내용 */}
      <div className="border border-gray-400 mb-10">
        <div className="bg-gray-100 px-4 py-2 border-b border-gray-400 font-bold text-sm">강의 결과 요약</div>
        <div className="px-4 py-4 text-sm leading-relaxed min-h-[80px]">
          {report.report_text || "—"}
        </div>
      </div>

      {/* 확인 문구 */}
      <p className="text-sm leading-loose text-center mb-12">
        위와 같이 화성 AI 시민리더 잇다(IT-DA) 플랫폼을 통하여 강의가 진행되었음을 확인합니다.
      </p>

      {/* 날인 */}
      <div className="flex justify-end">
        <div className="text-center">
          <p className="text-sm mb-8">{today}</p>
          <p className="font-bold text-base">화성특례시 AI 시민리더 잇다 운영팀</p>
          <p className="text-sm text-gray-500 mt-1">(직인 날인)</p>
          <div className="mt-4 w-20 h-20 border-2 border-red-400 rounded-full mx-auto flex items-center justify-center">
            <span className="text-red-500 font-bold text-xs text-center leading-tight">화성특례시<br/>직인</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────

export default function SettlementPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [reports, setReports] = useState<SettlementReport[]>([]);
  const [fetching, setFetching] = useState(true);
  const [selected, setSelected] = useState<SettlementReport | null>(null);
  const [filterApproved, setFilterApproved] = useState<"all" | "approved" | "pending">("all");
  const [search, setSearch] = useState("");
  const [approving, setApproving] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [showCert, setShowCert] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (selected) setNoteInput(selected.admin_note ?? "");
  }, [selected?.id]);

  async function fetchReports() {
    setFetching(true);
    const res = await fetch("/api/admin/settlement/reports");
    const data = await res.json();
    setReports(Array.isArray(data) ? data : []);
    setFetching(false);
  }

  useEffect(() => {
    if (user) fetchReports();
  }, [user]);

  const filtered = useMemo(() => {
    let list = reports;
    if (filterApproved === "approved") list = list.filter((r) => r.admin_approved_at !== null);
    if (filterApproved === "pending")  list = list.filter((r) => r.admin_approved_at === null);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          (r.match?.title ?? "").toLowerCase().includes(q) ||
          (r.match?.leader?.profiles?.name ?? "").toLowerCase().includes(q) ||
          (r.match?.client?.name ?? "").toLowerCase().includes(q) ||
          (r.match?.address ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [reports, filterApproved, search]);

  const summaryApproved = useMemo(() => reports.filter((r) => r.admin_approved_at !== null).length, [reports]);
  const summaryPending  = useMemo(() => reports.filter((r) => r.admin_approved_at === null).length, [reports]);
  const summaryAttendees = useMemo(() => reports.reduce((s, r) => s + r.attendance_count, 0), [reports]);
  const summaryRating    = useMemo(() => {
    const rated = reports.filter((r) => r.rating_from_client !== null);
    if (rated.length === 0) return null;
    return (rated.reduce((s, r) => s + Number(r.rating_from_client), 0) / rated.length).toFixed(2);
  }, [reports]);

  async function handleApprove() {
    if (!selected || approving) return;
    setApproving(true);
    const res = await fetch(`/api/admin/settlement/${selected.id}/approve`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: noteInput }),
    });
    if (res.ok) {
      const updated = await res.json();
      setReports((prev) => prev.map((r) => r.id === selected.id ? { ...r, ...updated } : r));
      setSelected((prev) => prev ? { ...prev, ...updated } : prev);
      setToast({ msg: "보고서가 승인되었습니다.", ok: true });
    } else {
      const err = await res.json().catch(() => ({}));
      setToast({ msg: err.error ?? "승인 중 오류가 발생했습니다.", ok: false });
    }
    setApproving(false);
  }

  function handlePrint() {
    setShowCert(true);
    setTimeout(() => window.print(), 400);
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-hwaseong-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Head><title>활동 결과 및 정산 관리 | 화성 AI 시민리더 잇다</title></Head>

      {/* 인쇄 전용 강의확인서 — 화면에는 hidden, 인쇄 시 표시 */}
      {showCert && selected && (
        <div className="hidden print:block" ref={printRef}>
          <LectureCertificate report={selected} />
        </div>
      )}

      <DashboardLayout pageTitle="활동 결과 및 정산 관리">

        {/* ── 페이지 헤더 ── */}
        <div className="bg-gradient-to-br from-emerald-700 to-teal-600 rounded-3xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">💰</div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-black text-white">활동 결과 및 정산 관리</h2>
            <p className="text-emerald-200 text-xs mt-0.5">완료된 강의 활동 보고서를 검토하고 정산 처리합니다.</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {summaryPending > 0 && (
              <span className="bg-amber-400 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
                미승인 {summaryPending}건
              </span>
            )}
            <button
              onClick={fetchReports}
              disabled={fetching}
              className="text-xs bg-white/10 border border-white/30 text-white px-3 py-1.5 rounded-xl hover:bg-white/20 transition-colors disabled:opacity-50"
            >
              {fetching ? "로딩..." : "↺ 새로고침"}
            </button>
          </div>
        </div>

        {/* ── 요약 카드 ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: "📋", label: "전체 보고서",   value: reports.length,   color: "text-hwaseong-text", bg: "bg-blue-50",   border: "border-blue-100" },
            { icon: "✅", label: "승인 완료",      value: summaryApproved,  color: "text-green-600",    bg: "bg-green-50",  border: "border-green-100" },
            { icon: "⏳", label: "승인 대기",      value: summaryPending,   color: summaryPending > 0 ? "text-amber-600" : "text-gray-400", bg: summaryPending > 0 ? "bg-amber-50" : "bg-gray-50", border: summaryPending > 0 ? "border-amber-200" : "border-gray-100" },
            { icon: "👥", label: "누적 수강생",    value: `${summaryAttendees}명`, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100" },
          ].map((c) => (
            <div key={c.label} className={`${c.bg} ${c.border} border rounded-2xl p-5 shadow-sm`}>
              <div className="text-2xl mb-2">{c.icon}</div>
              <p className={`text-3xl font-black ${c.color}`}>{c.value}</p>
              <p className="text-xs text-gray-500 mt-1">{c.label}</p>
            </div>
          ))}
        </div>

        {/* ── 메인 2분할 ── */}
        <div className="grid gap-4 lg:grid-cols-5">

          {/* 좌측 목록 (2/5) */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col" style={{ maxHeight: "calc(100vh - 320px)" }}>

            {/* 목록 헤더 */}
            <div className="p-4 border-b border-gray-100 space-y-3 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-hwaseong-text text-sm">보고서 목록</h3>
                <button
                  onClick={() => exportCSV(filtered)}
                  className="flex items-center gap-1.5 text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-xl hover:bg-emerald-700 transition-colors"
                >
                  <span>📊</span> 엑셀 내보내기
                </button>
              </div>

              {/* 필터 탭 */}
              <div className="flex gap-1">
                {(["all", "pending", "approved"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilterApproved(f)}
                    className={`flex-1 text-xs font-semibold py-1.5 rounded-xl transition-colors ${
                      filterApproved === f
                        ? "bg-hwaseong-blue text-white"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {f === "all" ? `전체 ${reports.length}` : f === "pending" ? `미승인 ${summaryPending}` : `승인 ${summaryApproved}`}
                  </button>
                ))}
              </div>

              {/* 검색 */}
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="강의 제목·강사·수요처·주소"
                  className="w-full pl-7 pr-7 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 text-xs">✕</button>
                )}
              </div>
            </div>

            {/* 목록 */}
            <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
              {fetching ? (
                <div className="flex items-center justify-center h-32 text-gray-300 text-sm">로딩 중...</div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-gray-300">
                  <p className="text-3xl mb-1">📋</p>
                  <p className="text-xs">보고서가 없습니다.</p>
                </div>
              ) : (
                filtered.map((r) => {
                  const isSelected = selected?.id === r.id;
                  const approved = r.admin_approved_at !== null;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelected(isSelected ? null : r)}
                      className={`w-full text-left px-4 py-3.5 transition-colors hover:bg-gray-50 ${isSelected ? "bg-blue-50 border-l-4 border-hwaseong-blue" : "border-l-4 border-transparent"}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-xs font-bold text-hwaseong-text leading-tight line-clamp-2 flex-1">
                          {r.match?.title ?? "—"}
                        </p>
                        <span className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          approved ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                        }`}>
                          {approved ? "✓ 승인" : "미승인"}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mb-1.5 truncate">
                        🏅 {r.match?.leader?.profiles?.name ?? "—"} · 🏢 {r.match?.client?.name ?? "—"}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-400">📅 {fmtDate(r.lecture_date ?? r.match?.start_date)}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400">👥 {r.attendance_count}명</span>
                          {r.rating_from_client !== null && (
                            <span className="text-[10px] text-amber-500 font-bold">⭐ {Number(r.rating_from_client).toFixed(1)}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* 우측 상세 (3/5) */}
          <div className="lg:col-span-3">
            {!selected ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center p-12 h-full min-h-[400px]">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-4xl mb-4">💰</div>
                <p className="text-base font-bold text-gray-400 mb-1">보고서를 선택하세요</p>
                <p className="text-sm text-gray-300">좌측 목록에서 보고서를 클릭하면<br />증빙 자료와 정산 정보를 확인할 수 있습니다.</p>
              </div>
            ) : (
              <div className="space-y-4">

                {/* 기본 정보 카드 */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="bg-gradient-to-r from-gray-50 to-white px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          selected.admin_approved_at ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                        }`}>
                          {selected.admin_approved_at ? "✓ 승인 완료" : "⏳ 승인 대기"}
                        </span>
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                          {selected.match?.category ?? "—"}
                        </span>
                      </div>
                      <h3 className="font-bold text-hwaseong-text text-base leading-tight">{selected.match?.title ?? "—"}</h3>
                    </div>
                    <button onClick={() => setSelected(null)} className="flex-shrink-0 w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 text-sm">✕</button>
                  </div>

                  <div className="p-5 grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    {[
                      { label: "강사",         value: selected.match?.leader?.profiles?.name ?? "—" },
                      { label: "수요처",        value: selected.match?.client?.name ?? "—" },
                      { label: "강의 일자",     value: fmtDate(selected.lecture_date ?? selected.match?.start_date) },
                      { label: "강의 주소",     value: selected.match?.address ?? "—" },
                      { label: "강의 형태",     value: selected.match?.location_type ? (LOC_LABELS[selected.match.location_type] ?? selected.match.location_type) : "—" },
                      { label: "진행 방식",     value: selected.match?.frequency ? (FREQ_LABELS[selected.match.frequency] ?? selected.match.frequency) : "—" },
                      { label: "참석 인원",     value: `${selected.attendance_count}명` },
                      { label: "보고서 제출일", value: fmtDateTime(selected.submitted_at) },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex gap-2">
                        <span className="text-gray-400 text-xs w-24 flex-shrink-0 pt-0.5">{label}</span>
                        <span className="text-hwaseong-text text-xs font-semibold">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 만족도 + 강의 일지 */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* 수요처 만족도 */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">수요처 만족도 평점</h4>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl font-black text-amber-500">
                          {selected.rating_from_client !== null ? Number(selected.rating_from_client).toFixed(1) : "—"}
                        </span>
                      </div>
                      <div>
                        <StarRating value={selected.rating_from_client} />
                        <p className="text-[11px] text-gray-400 mt-1.5">
                          {selected.rating_from_client !== null
                            ? selected.rating_from_client >= 4.5 ? "매우 만족"
                              : selected.rating_from_client >= 3.5 ? "만족"
                              : selected.rating_from_client >= 2.5 ? "보통"
                              : "아쉬움"
                            : "수요처가 아직 평가하지 않았습니다."}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 강의 일지 */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">강의 일지</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {selected.report_text || <span className="text-gray-300">강사가 작성한 강의 일지가 없습니다.</span>}
                    </p>
                  </div>
                </div>

                {/* 현장 사진 */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
                    현장 사진 ({selected.image_urls.length}장)
                  </h4>
                  {selected.image_urls.length === 0 ? (
                    <div className="h-24 flex items-center justify-center text-gray-300 text-sm border-2 border-dashed border-gray-200 rounded-xl">
                      <span>등록된 현장 사진이 없습니다.</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {selected.image_urls.map((url, i) => (
                        <button
                          key={i}
                          onClick={() => setLightboxImg(url)}
                          className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 hover:ring-2 hover:ring-hwaseong-blue/60 transition-all group"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt={`현장 사진 ${i + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <span className="text-white opacity-0 group-hover:opacity-100 text-lg">🔍</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 관리자 메모 + 승인/추출 버튼 */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide">관리자 검토</h4>

                  {selected.admin_approved_at && (
                    <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 flex items-center gap-2">
                      <span className="text-green-600">✅</span>
                      <div>
                        <p className="text-xs font-bold text-green-700">승인 완료</p>
                        <p className="text-[11px] text-green-600">{fmtDateTime(selected.admin_approved_at)}</p>
                      </div>
                    </div>
                  )}

                  {selected.admin_note && (
                    <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                      <p className="text-[11px] text-gray-500 mb-0.5">관리자 메모</p>
                      <p className="text-xs text-gray-700">{selected.admin_note}</p>
                    </div>
                  )}

                  {!selected.admin_approved_at && (
                    <div className="space-y-2">
                      <textarea
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        placeholder="검토 메모 (선택 사항) — 정산 특이사항, 감면 사유 등"
                        rows={2}
                        className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30 resize-none"
                      />
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2">
                    {/* 보고서 승인 버튼 */}
                    {!selected.admin_approved_at ? (
                      <button
                        onClick={handleApprove}
                        disabled={approving}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {approving
                          ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          : <span>✅</span>}
                        {approving ? "처리 중..." : "보고서 승인"}
                      </button>
                    ) : (
                      <div className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-400 text-sm font-semibold rounded-xl cursor-default">
                        <span>✅</span> 승인 완료
                      </div>
                    )}

                    {/* 서류 추출 드롭다운 */}
                    <ExportDropdown
                      onPDF={handlePrint}
                      onCSV={() => exportCSV([selected])}
                    />
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>

      </DashboardLayout>

      {/* 이미지 라이트박스 */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightboxImg(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightboxImg} alt="현장 사진" className="max-w-full max-h-full rounded-2xl shadow-2xl" />
          <button className="absolute top-4 right-4 text-white text-2xl hover:text-gray-300">✕</button>
        </div>
      )}

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

      {/* 인쇄 시 확인서만 보이는 전역 스타일 */}
      <style jsx global>{`
        @media print {
          body > * { display: none !important; }
          #certificate-print { display: block !important; }
          .hidden.print\\:block { display: block !important; }
        }
      `}</style>
    </>
  );
}

// ─── 서류 추출 드롭다운 ────────────────────────────────────────────────────

function ExportDropdown({ onPDF, onCSV }: { onPDF: () => void; onCSV: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-3 bg-hwaseong-blue text-white text-sm font-bold rounded-xl hover:bg-blue-900 transition-colors"
      >
        <span>📄</span> 서류 추출
        <span className="text-xs opacity-70">▾</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 bottom-full mb-2 z-20 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden w-44">
            <button
              onClick={() => { setOpen(false); onPDF(); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
            >
              <span className="text-base">🖨️</span>
              <div>
                <p className="font-semibold text-xs">강의확인서 (PDF)</p>
                <p className="text-[10px] text-gray-400">지출 증빙용 · 브라우저 인쇄</p>
              </div>
            </button>
            <div className="h-px bg-gray-100" />
            <button
              onClick={() => { setOpen(false); onCSV(); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
            >
              <span className="text-base">📊</span>
              <div>
                <p className="font-semibold text-xs">엑셀 (CSV)</p>
                <p className="text-[10px] text-gray-400">정산 목록 스프레드시트</p>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
