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

type InstructorFee = {
  id: string;
  attendance_count: number;
  lecture_date: string | null;
  submitted_at: string;
  admin_approved_at: string;
  admin_note: string | null;
  report_text: string | null;
  image_urls: string[];
  rating_from_client: number | null;
  instructor_fee: number;
  instructor_fee_paid_at: string | null;
  match: {
    id: string;
    title: string;
    category: string;
    address: string | null;
    location_type: string | null;
    frequency: string | null;
    leader: {
      id: string;
      profiles: { name: string; email: string } | null;
    } | null;
    client: { name: string; email: string } | null;
  } | null;
};

type RentalFee = {
  id: string;
  title: string;
  category: string;
  start_date: string;
  status: string;
  needs_venue: boolean;
  rental_venue_id: string | null;
  needs_equipment: boolean;
  rental_equipment_count: number;
  rental_notes: string | null;
  rental_fee_total: number;
  rental_fee_paid_at: string | null;
  venue: { id: string; name: string; fee_per_use: number; fee_unit: string } | null;
  equipment_fee_per_unit: number;
  suggested_fee: number;
  client: { name: string; email: string } | null;
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

function fmtWon(n: number): string {
  return n.toLocaleString("ko-KR") + "원";
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
      <div className="text-center mb-10">
        <p className="text-sm text-gray-500 mb-2">화성특례시</p>
        <h1 className="text-3xl font-black tracking-widest border-b-4 border-gray-900 pb-4 inline-block px-8">
          강 의 확 인 서
        </h1>
      </div>
      <div className="flex justify-between text-sm text-gray-500 mb-8">
        <span>문서번호: 화성AI잇다-{report.id.slice(0, 8).toUpperCase()}</span>
        <span>발행일: {today}</span>
      </div>
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
      <div className="border border-gray-400 mb-10">
        <div className="bg-gray-100 px-4 py-2 border-b border-gray-400 font-bold text-sm">강의 결과 요약</div>
        <div className="px-4 py-4 text-sm leading-relaxed min-h-[80px]">{report.report_text || "—"}</div>
      </div>
      <p className="text-sm leading-loose text-center mb-12">
        위와 같이 화성 AI 시민리더 잇다(IT-DA) 플랫폼을 통하여 강의가 진행되었음을 확인합니다.
      </p>
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

// ─── 인라인 금액 편집 셀 ───────────────────────────────────────────────────

function FeeCell({
  id, fee, editing, onStartEdit, onSave, onCancel, saving,
}: {
  id: string;
  fee: number;
  editing: { id: string; fee: string } | null;
  onStartEdit: (id: string, fee: number) => void;
  onSave: (id: string, fee: string) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  if (editing?.id === id) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="number" min="0" step="1000"
          value={editing.fee}
          onChange={(e) => onStartEdit(id, Number(e.target.value))}
          className="w-24 px-2 py-1 border border-hwaseong-blue rounded-lg text-xs text-right focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") onSave(id, editing.fee);
            if (e.key === "Escape") onCancel();
          }}
        />
        <span className="text-xs text-gray-400">원</span>
        <button onClick={() => onSave(id, editing.fee)} disabled={saving} className="px-2 py-1 bg-hwaseong-blue text-white text-xs font-bold rounded-lg hover:bg-blue-900 disabled:opacity-50">저장</button>
        <button onClick={onCancel} className="px-1.5 py-1 text-xs text-gray-400 rounded-lg hover:bg-gray-100">✕</button>
      </div>
    );
  }
  return (
    <button
      onClick={() => onStartEdit(id, fee)}
      className="flex items-center gap-1 group"
      title="클릭해서 수정"
    >
      <span className={`text-sm font-bold ${fee > 0 ? "text-hwaseong-blue" : "text-gray-300"}`}>
        {fee > 0 ? fmtWon(fee) : "미입력"}
      </span>
      <span className="text-gray-300 group-hover:text-gray-500 text-xs">✏️</span>
    </button>
  );
}

// ─── 페이지네이션 ──────────────────────────────────────────────────────────

function Pagination({ page, total, pageSize, onChange }: {
  page: number; total: number; pageSize: number; onChange: (p: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="text-xs font-semibold px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        ← 이전
      </button>
      <span className="text-xs text-gray-400">
        <span className="font-bold text-hwaseong-text">{page}</span> / {totalPages} 페이지
        <span className="ml-2 text-gray-300">({total}건)</span>
      </span>
      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        className="text-xs font-semibold px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        다음 →
      </button>
    </div>
  );
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────

export default function SettlementPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // ── 탭 ──
  const [activeTab, setActiveTab] = useState<"reports" | "instructor" | "rental">("reports");

  // ── 보고서 승인 탭 ──
  const [reports, setReports] = useState<SettlementReport[]>([]);
  const [fetching, setFetching] = useState(true);
  const [selected, setSelected] = useState<SettlementReport | null>(null);
  const [filterApproved, setFilterApproved] = useState<"all" | "approved" | "pending">("all");
  const [search, setSearch] = useState("");
  const [approving, setApproving] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [showCert, setShowCert] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // ── 강사료 정산 탭 ──
  const [instructorFees, setInstructorFees] = useState<InstructorFee[]>([]);
  const [selectedIFee, setSelectedIFee] = useState<InstructorFee | null>(null);
  const [showPaidIFees, setShowPaidIFees] = useState(false);
  const [iUnpaidPage, setIUnpaidPage] = useState(1);
  const [iPaidPage,   setIPaidPage]   = useState(1);
  const I_PAGE_SIZE = 5;
  const [editingIFee, setEditingIFee] = useState<{ id: string; fee: string } | null>(null);
  const [iFeeSaving, setIFeeSaving] = useState(false);

  // ── 대여료 정산 탭 ──
  const [rentalFees, setRentalFees] = useState<RentalFee[]>([]);
  const [selectedRFee, setSelectedRFee] = useState<RentalFee | null>(null);
  const [showPaidRFees, setShowPaidRFees] = useState(false);
  const [rUnpaidPage, setRUnpaidPage] = useState(1);
  const [rPaidPage,   setRPaidPage]   = useState(1);
  const R_PAGE_SIZE = 5;
  const [editingRFee, setEditingRFee] = useState<{ id: string; fee: string } | null>(null);
  const [rFeeSaving, setRFeeSaving] = useState(false);

  // ── 공통 ──
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

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

  async function fetchAll() {
    setFetching(true);
    const [rpts, ifees, rfees] = await Promise.all([
      fetch("/api/admin/settlement/reports").then((r) => r.json()),
      fetch("/api/admin/settlement/instructor-fees").then((r) => r.json()),
      fetch("/api/admin/settlement/rental-fees").then((r) => r.json()),
    ]);
    setReports(Array.isArray(rpts) ? rpts : []);
    setInstructorFees(Array.isArray(ifees) ? ifees : []);
    setRentalFees(Array.isArray(rfees) ? rfees : []);
    setFetching(false);
  }

  useEffect(() => {
    if (user) fetchAll();
  }, [user]);

  // ── 보고서 승인 ──

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

  const summaryApproved  = useMemo(() => reports.filter((r) => r.admin_approved_at !== null).length, [reports]);
  const summaryPending   = useMemo(() => reports.filter((r) => r.admin_approved_at === null).length, [reports]);
  const summaryAttendees = useMemo(() => reports.reduce((s, r) => s + r.attendance_count, 0), [reports]);

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

  // ── 강사료 정산 ──

  const unpaidIFees = useMemo(() => instructorFees.filter((r) => r.instructor_fee_paid_at === null), [instructorFees]);
  const paidIFees   = useMemo(() =>
    instructorFees
      .filter((r) => r.instructor_fee_paid_at !== null)
      .sort((a, b) => (b.lecture_date ?? "").localeCompare(a.lecture_date ?? "")),
  [instructorFees]);

  const iUnpaidCount  = unpaidIFees.length;
  const iUnpaidTotal  = useMemo(() => instructorFees.filter((r) => !r.instructor_fee_paid_at).reduce((s, r) => s + r.instructor_fee, 0), [instructorFees]);
  const iPaidTotal    = useMemo(() => instructorFees.filter((r) => r.instructor_fee_paid_at).reduce((s, r) => s + r.instructor_fee, 0), [instructorFees]);

  async function saveIFee(id: string, feeStr: string) {
    const fee = Number(feeStr);
    if (isNaN(fee) || fee < 0) return;
    setIFeeSaving(true);
    const res = await fetch(`/api/admin/settlement/${id}/instructor-fee`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fee }),
    });
    if (res.ok) {
      const updated = await res.json();
      setInstructorFees((prev) => prev.map((r) => r.id === id ? { ...r, ...updated } : r));
      setToast({ msg: "강사료가 저장되었습니다.", ok: true });
    } else {
      setToast({ msg: "저장 실패", ok: false });
    }
    setEditingIFee(null);
    setIFeeSaving(false);
  }

  async function markIFeePaid(id: string, paid: boolean) {
    const res = await fetch(`/api/admin/settlement/${id}/instructor-fee`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markPaid: paid }),
    });
    if (res.ok) {
      const updated = await res.json();
      setInstructorFees((prev) => prev.map((r) => r.id === id ? { ...r, ...updated } : r));
      setToast({ msg: paid ? "지급 처리되었습니다." : "지급 취소되었습니다.", ok: true });
    } else {
      setToast({ msg: "처리 실패", ok: false });
    }
  }

  // ── 대여료 정산 ──

  const unpaidRFees = useMemo(() => rentalFees.filter((r) => r.rental_fee_paid_at === null), [rentalFees]);
  const paidRFees   = useMemo(() =>
    rentalFees
      .filter((r) => r.rental_fee_paid_at !== null)
      .sort((a, b) => (b.start_date ?? "").localeCompare(a.start_date ?? "")),
  [rentalFees]);

  const rUnpaidCount = useMemo(() => rentalFees.filter((r) => r.rental_fee_paid_at === null).length, [rentalFees]);
  const rUnpaidTotal = useMemo(() => rentalFees.filter((r) => !r.rental_fee_paid_at).reduce((s, r) => s + r.rental_fee_total, 0), [rentalFees]);
  const rPaidTotal   = useMemo(() => rentalFees.filter((r) => r.rental_fee_paid_at).reduce((s, r) => s + r.rental_fee_total, 0), [rentalFees]);

  async function saveRFee(id: string, feeStr: string) {
    const fee = Number(feeStr);
    if (isNaN(fee) || fee < 0) return;
    setRFeeSaving(true);
    const res = await fetch(`/api/admin/settlement/rental-fee/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fee }),
    });
    if (res.ok) {
      const updated = await res.json();
      setRentalFees((prev) => prev.map((r) => r.id === id ? { ...r, ...updated } : r));
      setToast({ msg: "대여료가 저장되었습니다.", ok: true });
    } else {
      setToast({ msg: "저장 실패", ok: false });
    }
    setEditingRFee(null);
    setRFeeSaving(false);
  }

  async function markRFeePaid(id: string, paid: boolean) {
    const res = await fetch(`/api/admin/settlement/rental-fee/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markPaid: paid }),
    });
    if (res.ok) {
      const updated = await res.json();
      setRentalFees((prev) => prev.map((r) => r.id === id ? { ...r, ...updated } : r));
      setToast({ msg: paid ? "수납 처리되었습니다." : "수납 취소되었습니다.", ok: true });
    } else {
      setToast({ msg: "처리 실패", ok: false });
    }
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
            <p className="text-emerald-200 text-xs mt-0.5">보고서 승인 · 강사료 지급 · 대여료 수납을 통합 관리합니다.</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {summaryPending > 0 && (
              <span className="bg-amber-400 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
                미승인 {summaryPending}건
              </span>
            )}
            {iUnpaidCount > 0 && (
              <span className="bg-blue-400 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                강사료 미지급 {iUnpaidCount}건
              </span>
            )}
            {rUnpaidCount > 0 && (
              <span className="bg-orange-400 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                대여료 미수납 {rUnpaidCount}건
              </span>
            )}
            <button
              onClick={fetchAll}
              disabled={fetching}
              className="text-xs bg-white/10 border border-white/30 text-white px-3 py-1.5 rounded-xl hover:bg-white/20 transition-colors disabled:opacity-50"
            >
              {fetching ? "로딩..." : "↺ 새로고침"}
            </button>
          </div>
        </div>

        {/* ── 탭 네비게이션 ── */}
        <div className="flex gap-2 border-b border-gray-200 pb-0">
          {([
            { key: "reports",    label: "📋 보고서 승인",  badge: summaryPending },
            { key: "instructor", label: "💵 강사료 정산",  badge: iUnpaidCount },
            { key: "rental",     label: "🏢 대여료 정산",  badge: rUnpaidCount },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-xl border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-hwaseong-blue text-hwaseong-blue bg-blue-50/60"
                  : "border-transparent text-gray-500 hover:text-hwaseong-blue"
              }`}
            >
              {tab.label}
              {tab.badge > 0 && (
                <span className="min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════
            탭 1: 보고서 승인
        ══════════════════════════════════════════════════════════ */}
        {activeTab === "reports" && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: "📋", label: "전체 보고서", value: reports.length,   color: "text-hwaseong-text", bg: "bg-blue-50",   border: "border-blue-100" },
                { icon: "✅", label: "승인 완료",   value: summaryApproved,  color: "text-green-600",    bg: "bg-green-50",  border: "border-green-100" },
                { icon: "⏳", label: "승인 대기",   value: summaryPending,   color: summaryPending > 0 ? "text-amber-600" : "text-gray-400", bg: summaryPending > 0 ? "bg-amber-50" : "bg-gray-50", border: summaryPending > 0 ? "border-amber-200" : "border-gray-100" },
                { icon: "👥", label: "누적 수강생", value: `${summaryAttendees}명`, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-100" },
              ].map((c) => (
                <div key={c.label} className={`${c.bg} ${c.border} border rounded-2xl p-5 shadow-sm`}>
                  <div className="text-2xl mb-2">{c.icon}</div>
                  <p className={`text-3xl font-black ${c.color}`}>{c.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{c.label}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-5">
              {/* 좌측 목록 */}
              <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col" style={{ maxHeight: "calc(100vh - 380px)" }}>
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
                  <div className="flex gap-1">
                    {(["all", "pending", "approved"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setFilterApproved(f)}
                        className={`flex-1 text-xs font-semibold py-1.5 rounded-xl transition-colors ${
                          filterApproved === f ? "bg-hwaseong-blue text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {f === "all" ? `전체 ${reports.length}` : f === "pending" ? `미승인 ${summaryPending}` : `승인 ${summaryApproved}`}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
                    <input
                      type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                      placeholder="강의 제목·강사·수요처·주소"
                      className="w-full pl-7 pr-7 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30"
                    />
                    {search && (
                      <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 text-xs">✕</button>
                    )}
                  </div>
                </div>
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
                            <p className="text-xs font-bold text-hwaseong-text leading-tight line-clamp-2 flex-1">{r.match?.title ?? "—"}</p>
                            <span className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${approved ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
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

              {/* 우측 상세 */}
              <div className="lg:col-span-3">
                {!selected ? (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center p-12 h-full min-h-[400px]">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-4xl mb-4">💰</div>
                    <p className="text-base font-bold text-gray-400 mb-1">보고서를 선택하세요</p>
                    <p className="text-sm text-gray-300">좌측 목록에서 보고서를 클릭하면<br />증빙 자료와 정산 정보를 확인할 수 있습니다.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className="bg-gradient-to-r from-gray-50 to-white px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${selected.admin_approved_at ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                              {selected.admin_approved_at ? "✓ 승인 완료" : "⏳ 승인 대기"}
                            </span>
                            <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{selected.match?.category ?? "—"}</span>
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

                    <div className="grid sm:grid-cols-2 gap-4">
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
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">강의 일지</h4>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          {selected.report_text || <span className="text-gray-300">강사가 작성한 강의 일지가 없습니다.</span>}
                        </p>
                      </div>
                    </div>

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
                        <textarea
                          value={noteInput}
                          onChange={(e) => setNoteInput(e.target.value)}
                          placeholder="검토 메모 (선택 사항) — 정산 특이사항, 감면 사유 등"
                          rows={2}
                          className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30 resize-none"
                        />
                      )}
                      <div className="flex flex-col sm:flex-row gap-2">
                        {!selected.admin_approved_at ? (
                          <button
                            onClick={handleApprove}
                            disabled={approving}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            {approving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span>✅</span>}
                            {approving ? "처리 중..." : "보고서 승인"}
                          </button>
                        ) : (
                          <div className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-400 text-sm font-semibold rounded-xl cursor-default">
                            <span>✅</span> 승인 완료
                          </div>
                        )}
                        <ExportDropdown onPDF={handlePrint} onCSV={() => exportCSV([selected])} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════
            탭 2: 강사료 정산
        ══════════════════════════════════════════════════════════ */}
        {activeTab === "instructor" && (
          <>
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: "⏳", label: "미지급 건수",  value: `${iUnpaidCount}건`,  color: iUnpaidCount > 0 ? "text-amber-600" : "text-gray-400",  bg: iUnpaidCount > 0 ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-100" },
                { icon: "💸", label: "미지급 총액",  value: fmtWon(iUnpaidTotal), color: iUnpaidTotal > 0 ? "text-red-600"   : "text-gray-400",  bg: iUnpaidTotal > 0 ? "bg-red-50 border-red-200"     : "bg-gray-50 border-gray-100" },
                { icon: "✅", label: "지급 완료 총액", value: fmtWon(iPaidTotal), color: "text-green-600",                                         bg: "bg-green-50 border-green-100" },
              ].map((c) => (
                <div key={c.label} className={`${c.bg} border rounded-2xl p-5 shadow-sm`}>
                  <div className="text-2xl mb-2">{c.icon}</div>
                  <p className={`text-2xl font-black ${c.color}`}>{c.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{c.label}</p>
                </div>
              ))}
            </div>

            {fetching ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center h-32 text-gray-300 text-sm">로딩 중...</div>
            ) : instructorFees.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center h-32 text-gray-300">
                <p className="text-3xl mb-1">💵</p>
                <p className="text-xs">승인된 보고서가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-3">

                {/* ── 미지급 섹션 ── */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-3.5 bg-amber-50/60 border-b border-amber-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">⏳</span>
                      <span className="text-sm font-bold text-hwaseong-text">지급 처리 필요</span>
                      {unpaidIFees.length > 0 && (
                        <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{unpaidIFees.length}건</span>
                      )}
                    </div>
                    {iUnpaidTotal > 0 && (
                      <span className="text-sm font-bold text-red-500">{fmtWon(iUnpaidTotal)}</span>
                    )}
                  </div>
                  {unpaidIFees.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-gray-300 text-sm gap-2">
                      <span>🎉</span> 미지급 항목이 없습니다.
                    </div>
                  ) : (
                    <>
                    <div className="divide-y divide-gray-50">
                      {unpaidIFees.slice((iUnpaidPage - 1) * I_PAGE_SIZE, iUnpaidPage * I_PAGE_SIZE).map((r) => {
                        const noFee = r.instructor_fee === 0;
                        const name  = r.match?.leader?.profiles?.name ?? "—";
                        return (
                          <div key={r.id} onClick={() => setSelectedIFee(r)} className={`flex items-center gap-4 px-5 py-4 border-l-4 ${noFee ? "border-l-gray-200" : "border-l-hwaseong-blue"} hover:bg-gray-50/60 transition-colors cursor-pointer`}>
                            <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden">
                              {r.image_urls?.length > 0 ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={r.image_urls[0]} alt="현장 사진" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-black">{name.charAt(0)}</div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-sm font-bold text-hwaseong-text">{name}</span>
                                <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">{r.match?.category ?? "—"}</span>
                              </div>
                              <p className="text-xs text-gray-600 truncate">{r.match?.title ?? "—"}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-[11px] text-gray-400">📅 {fmtDate(r.lecture_date)}</span>
                                <span className="text-[11px] text-gray-400">👥 {r.attendance_count}명</span>
                                {r.rating_from_client !== null && (
                                  <span className="text-[11px] text-amber-500 font-bold">⭐ {Number(r.rating_from_client).toFixed(1)}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex-shrink-0 min-w-[120px] text-right" onClick={(e) => e.stopPropagation()}>
                              <FeeCell
                                id={r.id} fee={r.instructor_fee} editing={editingIFee}
                                onStartEdit={(id, fee) => setEditingIFee({ id, fee: String(fee) })}
                                onSave={saveIFee} onCancel={() => setEditingIFee(null)}
                                saving={iFeeSaving}
                              />
                            </div>
                            <div className="flex-shrink-0 flex flex-col items-end gap-1.5 min-w-[90px]" onClick={(e) => e.stopPropagation()}>
                              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${noFee ? "bg-gray-100 text-gray-400" : "bg-amber-100 text-amber-700"}`}>
                                {noFee ? "금액 미입력" : "미지급"}
                              </span>
                              <button
                                onClick={() => markIFeePaid(r.id, true)}
                                disabled={noFee}
                                className="text-xs font-bold px-3 py-1.5 bg-hwaseong-blue text-white rounded-xl hover:bg-blue-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors w-full text-center"
                                title={noFee ? "강사료를 먼저 입력해주세요" : "지급 처리"}
                              >
                                지급처리
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <Pagination page={iUnpaidPage} total={unpaidIFees.length} pageSize={I_PAGE_SIZE} onChange={setIUnpaidPage} />
                    </>
                  )}
                </div>

                {/* ── 지급완료 섹션 (접기/펼치기) ── */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setShowPaidIFees(!showPaidIFees)}
                    className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">✅</span>
                      <span className="text-sm font-bold text-gray-500">지급 완료</span>
                      <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{paidIFees.length}건</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-green-600">{fmtWon(iPaidTotal)}</span>
                      <span className="text-gray-400 text-xs">{showPaidIFees ? "▲" : "▼"}</span>
                    </div>
                  </button>
                  {showPaidIFees && (
                    <div className="divide-y divide-gray-50 border-t border-gray-100">
                      {paidIFees.length === 0 ? (
                        <div className="flex items-center justify-center py-6 text-gray-300 text-sm">완료된 항목이 없습니다.</div>
                      ) : (
                        <>
                        {paidIFees.slice((iPaidPage - 1) * I_PAGE_SIZE, iPaidPage * I_PAGE_SIZE).map((r) => {
                          const name = r.match?.leader?.profiles?.name ?? "—";
                          return (
                            <div key={r.id} onClick={() => setSelectedIFee(r)} className="flex items-center gap-4 px-5 py-4 border-l-4 border-l-green-300 bg-green-50/30 hover:bg-green-50/60 transition-colors opacity-75 cursor-pointer">
                              <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden">
                                {r.image_urls?.length > 0 ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={r.image_urls[0]} alt="현장 사진" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-green-100 text-green-700 flex items-center justify-center text-sm font-black">{name.charAt(0)}</div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-sm font-bold text-gray-500">{name}</span>
                                  <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">{r.match?.category ?? "—"}</span>
                                </div>
                                <p className="text-xs text-gray-400 truncate">{r.match?.title ?? "—"}</p>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="text-[11px] text-gray-400">📅 {fmtDate(r.lecture_date)}</span>
                                  <span className="text-[11px] text-gray-400">👥 {r.attendance_count}명</span>
                                  {r.rating_from_client !== null && (
                                    <span className="text-[11px] text-amber-500 font-bold">⭐ {Number(r.rating_from_client).toFixed(1)}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex-shrink-0 min-w-[120px] text-right">
                                <span className="text-sm font-bold text-green-600">{fmtWon(r.instructor_fee)}</span>
                              </div>
                              <div className="flex-shrink-0 flex flex-col items-end gap-1.5 min-w-[90px]" onClick={(e) => e.stopPropagation()}>
                                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700">✓ 지급완료</span>
                                <button
                                  onClick={() => markIFeePaid(r.id, false)}
                                  className="text-[10px] text-gray-300 hover:text-red-400 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors w-full text-center"
                                >
                                  지급 취소
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        <Pagination page={iPaidPage} total={paidIFees.length} pageSize={I_PAGE_SIZE} onChange={setIPaidPage} />
                        </>
                      )}
                    </div>
                  )}
                </div>

              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════
            탭 3: 대여료 정산
        ══════════════════════════════════════════════════════════ */}
        {activeTab === "rental" && (
          <>
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: "⏳", label: "미수납 건수",    value: `${rUnpaidCount}건`,  color: rUnpaidCount > 0 ? "text-amber-600" : "text-gray-400",  bg: rUnpaidCount > 0 ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-100" },
                { icon: "💸", label: "미수납 총액",    value: fmtWon(rUnpaidTotal), color: rUnpaidTotal > 0 ? "text-red-600"   : "text-gray-400",  bg: rUnpaidTotal > 0 ? "bg-red-50 border-red-200"     : "bg-gray-50 border-gray-100" },
                { icon: "✅", label: "수납 완료 총액", value: fmtWon(rPaidTotal),   color: "text-green-600",                                         bg: "bg-green-50 border-green-100" },
              ].map((c) => (
                <div key={c.label} className={`${c.bg} border rounded-2xl p-5 shadow-sm`}>
                  <div className="text-2xl mb-2">{c.icon}</div>
                  <p className={`text-2xl font-black ${c.color}`}>{c.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{c.label}</p>
                </div>
              ))}
            </div>

            {fetching ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center h-32 text-gray-300 text-sm">로딩 중...</div>
            ) : rentalFees.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center h-32 text-gray-300">
                <p className="text-3xl mb-1">🏢</p>
                <p className="text-xs">대여 신청된 강의가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-3">

                {/* ── 미수납 섹션 ── */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-3.5 bg-amber-50/60 border-b border-amber-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">⏳</span>
                      <span className="text-sm font-bold text-hwaseong-text">수납 처리 필요</span>
                      {unpaidRFees.length > 0 && (
                        <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{unpaidRFees.length}건</span>
                      )}
                    </div>
                    {rUnpaidTotal > 0 && (
                      <span className="text-sm font-bold text-red-500">{fmtWon(rUnpaidTotal)}</span>
                    )}
                  </div>
                  {unpaidRFees.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-gray-300 text-sm gap-2">
                      <span>🎉</span> 미수납 항목이 없습니다.
                    </div>
                  ) : (
                    <>
                    <div className="divide-y divide-gray-50">
                      {unpaidRFees.slice((rUnpaidPage - 1) * R_PAGE_SIZE, rUnpaidPage * R_PAGE_SIZE).map((r) => {
                        const noFee = r.rental_fee_total === 0;
                        const clientName = r.client?.name ?? "—";
                        return (
                          <div key={r.id} onClick={() => setSelectedRFee(r)} className={`flex items-center gap-4 px-5 py-4 border-l-4 ${noFee ? "border-l-gray-200" : "border-l-orange-400"} hover:bg-gray-50/60 transition-colors cursor-pointer`}>
                            <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-base flex-shrink-0">
                              {r.needs_venue && r.needs_equipment ? "🏢" : r.needs_venue ? "🏢" : "💻"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-sm font-bold text-hwaseong-text truncate">{clientName}</span>
                                <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full flex-shrink-0">{r.category}</span>
                              </div>
                              <p className="text-xs text-gray-600 truncate">{r.title}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-[11px] text-gray-400">📅 {fmtDate(r.start_date)}</span>
                                {r.needs_venue && (
                                  <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full">🏢 강의실: {r.venue?.name ?? "—"}</span>
                                )}
                                {r.needs_equipment && (
                                  <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-full">💻 장비: 노트북 {r.rental_equipment_count}대</span>
                                )}
                              </div>
                            </div>
                            <div className="flex-shrink-0 min-w-[140px] text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="mb-1">
                                <FeeCell
                                  id={r.id} fee={r.rental_fee_total} editing={editingRFee}
                                  onStartEdit={(id, fee) => setEditingRFee({ id, fee: String(fee) })}
                                  onSave={saveRFee} onCancel={() => setEditingRFee(null)}
                                  saving={rFeeSaving}
                                />
                              </div>
                              {r.suggested_fee > 0 && (
                                <p className="text-[10px] text-gray-400" title="설정 기준 자동 산출 금액">참고 {fmtWon(r.suggested_fee)}</p>
                              )}
                            </div>
                            <div className="flex-shrink-0 flex flex-col items-end gap-1.5 min-w-[90px]" onClick={(e) => e.stopPropagation()}>
                              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${noFee ? "bg-gray-100 text-gray-400" : "bg-amber-100 text-amber-700"}`}>
                                {noFee ? "금액 미입력" : "미수납"}
                              </span>
                              <button
                                onClick={() => markRFeePaid(r.id, true)}
                                disabled={noFee}
                                className="text-xs font-bold px-3 py-1.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors w-full text-center"
                                title={noFee ? "대여료를 먼저 입력해주세요" : "수납 처리"}
                              >
                                수납처리
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <Pagination page={rUnpaidPage} total={unpaidRFees.length} pageSize={R_PAGE_SIZE} onChange={setRUnpaidPage} />
                    </>
                  )}
                </div>

                {/* ── 수납완료 섹션 (접기/펼치기) ── */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setShowPaidRFees(!showPaidRFees)}
                    className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">✅</span>
                      <span className="text-sm font-bold text-gray-500">수납 완료</span>
                      <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{paidRFees.length}건</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-green-600">{fmtWon(rPaidTotal)}</span>
                      <span className="text-gray-400 text-xs">{showPaidRFees ? "▲" : "▼"}</span>
                    </div>
                  </button>
                  {showPaidRFees && (
                    <div className="divide-y divide-gray-50 border-t border-gray-100">
                      {paidRFees.length === 0 ? (
                        <div className="flex items-center justify-center py-6 text-gray-300 text-sm">완료된 항목이 없습니다.</div>
                      ) : (
                        <>
                        {paidRFees.slice((rPaidPage - 1) * R_PAGE_SIZE, rPaidPage * R_PAGE_SIZE).map((r) => {
                          const clientName = r.client?.name ?? "—";
                          return (
                            <div key={r.id} onClick={() => setSelectedRFee(r)} className="flex items-center gap-4 px-5 py-4 border-l-4 border-l-green-300 bg-green-50/30 hover:bg-green-50/60 transition-colors opacity-75 cursor-pointer">
                              <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-base flex-shrink-0">
                                {r.needs_venue ? "🏢" : "💻"}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-sm font-bold text-gray-500 truncate">{clientName}</span>
                                  <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full flex-shrink-0">{r.category}</span>
                                </div>
                                <p className="text-xs text-gray-400 truncate">{r.title}</p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span className="text-[11px] text-gray-400">📅 {fmtDate(r.start_date)}</span>
                                  {r.needs_venue && (
                                    <span className="text-[10px] bg-gray-50 text-gray-400 px-1.5 py-0.5 rounded-full">🏢 강의실: {r.venue?.name ?? "—"}</span>
                                  )}
                                  {r.needs_equipment && (
                                    <span className="text-[10px] bg-gray-50 text-gray-400 px-1.5 py-0.5 rounded-full">💻 장비: 노트북 {r.rental_equipment_count}대</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex-shrink-0 min-w-[120px] text-right">
                                <span className="text-sm font-bold text-green-600">{fmtWon(r.rental_fee_total)}</span>
                              </div>
                              <div className="flex-shrink-0 flex flex-col items-end gap-1.5 min-w-[90px]" onClick={(e) => e.stopPropagation()}>
                                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700">✓ 수납완료</span>
                                <button
                                  onClick={() => markRFeePaid(r.id, false)}
                                  className="text-[10px] text-gray-300 hover:text-red-400 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors w-full text-center"
                                >
                                  수납 취소
                                </button>
                              </div>
                            </div>
                          );
                        })}
                        <Pagination page={rPaidPage} total={paidRFees.length} pageSize={R_PAGE_SIZE} onChange={setRPaidPage} />
                        </>
                      )}
                    </div>
                  )}
                </div>

              </div>
            )}
          </>
        )}

      </DashboardLayout>

      {/* 강사료 보고서 모달 */}
      {selectedIFee && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4"
          onClick={() => setSelectedIFee(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="sticky top-0 bg-white px-6 pt-5 pb-4 border-b border-gray-100 flex items-start justify-between gap-3 z-10">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">✓ 관리자 승인</span>
                  <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{selectedIFee.match?.category ?? "—"}</span>
                  {selectedIFee.instructor_fee_paid_at
                    ? <span className="text-[10px] bg-green-50 text-green-700 font-bold px-2 py-0.5 rounded-full">✓ 강사료 지급완료</span>
                    : <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-full">⏳ 강사료 미지급</span>
                  }
                </div>
                <h3 className="font-bold text-hwaseong-text text-base leading-tight">{selectedIFee.match?.title ?? "—"}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{selectedIFee.match?.leader?.profiles?.name ?? "—"} 강사</p>
              </div>
              <button
                onClick={() => setSelectedIFee(null)}
                className="flex-shrink-0 w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* 기본 정보 */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                {[
                  { label: "강사",     value: selectedIFee.match?.leader?.profiles?.name ?? "—" },
                  { label: "수요처",   value: selectedIFee.match?.client?.name ?? "—" },
                  { label: "강의 일자", value: fmtDate(selectedIFee.lecture_date) },
                  { label: "강의 주소", value: selectedIFee.match?.address ?? "—" },
                  { label: "강의 형태", value: selectedIFee.match?.location_type ? (LOC_LABELS[selectedIFee.match.location_type] ?? selectedIFee.match.location_type) : "—" },
                  { label: "참석 인원", value: `${selectedIFee.attendance_count}명` },
                  { label: "강사료",   value: selectedIFee.instructor_fee > 0 ? fmtWon(selectedIFee.instructor_fee) : "미입력" },
                  { label: "지급 일시", value: selectedIFee.instructor_fee_paid_at ? fmtDateTime(selectedIFee.instructor_fee_paid_at) : "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex gap-2">
                    <span className="text-gray-400 text-xs w-20 flex-shrink-0 pt-0.5">{label}</span>
                    <span className="text-hwaseong-text text-xs font-semibold">{value}</span>
                  </div>
                ))}
              </div>

              {/* 만족도 평점 */}
              {selectedIFee.rating_from_client !== null && (
                <div className="bg-amber-50 rounded-2xl p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                    <span className="text-xl font-black text-amber-500">{Number(selectedIFee.rating_from_client).toFixed(1)}</span>
                  </div>
                  <div>
                    <StarRating value={selectedIFee.rating_from_client} />
                    <p className="text-[11px] text-amber-700 mt-1">
                      {selectedIFee.rating_from_client >= 4.5 ? "매우 만족" : selectedIFee.rating_from_client >= 3.5 ? "만족" : selectedIFee.rating_from_client >= 2.5 ? "보통" : "아쉬움"}
                    </p>
                  </div>
                </div>
              )}

              {/* 강의 일지 */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">강의 일지</p>
                <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 rounded-xl px-4 py-3">
                  {selectedIFee.report_text || <span className="text-gray-300">작성된 강의 일지가 없습니다.</span>}
                </p>
              </div>

              {/* 현장 사진 */}
              {selectedIFee.image_urls?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">현장 사진 ({selectedIFee.image_urls.length}장)</p>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedIFee.image_urls.map((url, i) => (
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
                </div>
              )}

              {/* 관리자 메모 */}
              {selectedIFee.admin_note && (
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-[11px] text-gray-400 mb-1">관리자 메모</p>
                  <p className="text-xs text-gray-700">{selectedIFee.admin_note}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 대여료 상세 모달 */}
      {selectedRFee && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4"
          onClick={() => setSelectedRFee(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="sticky top-0 bg-white px-6 pt-5 pb-4 border-b border-gray-100 flex items-start justify-between gap-3 z-10">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{selectedRFee.category}</span>
                  {selectedRFee.rental_fee_paid_at
                    ? <span className="text-[10px] bg-green-50 text-green-700 font-bold px-2 py-0.5 rounded-full">✓ 수납완료</span>
                    : <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-full">⏳ 미수납</span>
                  }
                </div>
                <h3 className="font-bold text-hwaseong-text text-base leading-tight">{selectedRFee.title}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{selectedRFee.client?.name ?? "—"} 수요처</p>
              </div>
              <button
                onClick={() => setSelectedRFee(null)}
                className="flex-shrink-0 w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* 기본 정보 */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                {[
                  { label: "수요처",   value: selectedRFee.client?.name ?? "—" },
                  { label: "강의 일자", value: fmtDate(selectedRFee.start_date) },
                  { label: "확정 대여료", value: selectedRFee.rental_fee_total > 0 ? fmtWon(selectedRFee.rental_fee_total) : "미입력" },
                  { label: "수납 일시", value: selectedRFee.rental_fee_paid_at ? fmtDateTime(selectedRFee.rental_fee_paid_at) : "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex gap-2">
                    <span className="text-gray-400 text-xs w-20 flex-shrink-0 pt-0.5">{label}</span>
                    <span className="text-hwaseong-text text-xs font-semibold">{value}</span>
                  </div>
                ))}
              </div>

              {/* 공간 대여 상세 */}
              {selectedRFee.needs_venue && selectedRFee.venue && (
                <div className="bg-indigo-50 rounded-2xl p-4 space-y-2">
                  <p className="text-xs font-bold text-indigo-700 flex items-center gap-1.5">🏢 강의실 대여</p>
                  <div className="space-y-1.5">
                    <div className="flex gap-2">
                      <span className="text-indigo-400 text-xs w-14 flex-shrink-0">공간명</span>
                      <span className="text-indigo-900 text-xs font-semibold">{selectedRFee.venue.name}</span>
                    </div>
                    {selectedRFee.venue.fee_per_use > 0 && (
                      <div className="flex gap-2">
                        <span className="text-indigo-400 text-xs w-14 flex-shrink-0">기준 요금</span>
                        <span className="text-indigo-900 text-xs font-semibold">{fmtWon(selectedRFee.venue.fee_per_use)}/{selectedRFee.venue.fee_unit}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 장비 대여 상세 */}
              {selectedRFee.needs_equipment && (
                <div className="bg-purple-50 rounded-2xl p-4 space-y-2">
                  <p className="text-xs font-bold text-purple-700 flex items-center gap-1.5">💻 장비 대여</p>
                  <div className="space-y-1.5">
                    <div className="flex gap-2">
                      <span className="text-purple-400 text-xs w-14 flex-shrink-0">수량</span>
                      <span className="text-purple-900 text-xs font-semibold">노트북 {selectedRFee.rental_equipment_count}대</span>
                    </div>
                    {selectedRFee.equipment_fee_per_unit > 0 && (
                      <div className="flex gap-2">
                        <span className="text-purple-400 text-xs w-14 flex-shrink-0">단가</span>
                        <span className="text-purple-900 text-xs font-semibold">{fmtWon(selectedRFee.equipment_fee_per_unit)}/대</span>
                      </div>
                    )}
                    {selectedRFee.suggested_fee > 0 && (
                      <div className="flex gap-2">
                        <span className="text-purple-400 text-xs w-14 flex-shrink-0">참고 금액</span>
                        <span className="text-purple-900 text-xs font-semibold">{fmtWon(selectedRFee.suggested_fee)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 요청사항 */}
              {selectedRFee.rental_notes && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">요청사항</p>
                  <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 rounded-xl px-4 py-3">
                    {selectedRFee.rental_notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
