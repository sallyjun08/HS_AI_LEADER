import Head from "next/head";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/lib/auth-context";
import DashboardLayout from "@/components/DashboardLayout";

type ReviewRequest = {
  id: string;
  title: string;
  category: string;
  target_age: string | null;
  participant_count: number;
  institution_type: string | null;
  address: string | null;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  frequency: string;
  location_type: string;
  status: string;
  is_approved: boolean;
  cancel_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
  client: { name: string; email: string } | null;
};

const ZONES = [
  { key: "all",  label: "전체" },
  { key: "동부", label: "동부 (동탄)" },
  { key: "남부", label: "남부 (봉담·향남)" },
  { key: "서부", label: "서부 (남양·팔탄)" },
  { key: "북부", label: "북부 (병점·기산)" },
  { key: "기타", label: "기타 지역" },
] as const;

const ZONE_KEYWORDS: Record<string, string[]> = {
  동부: ["동탄", "오산동", "능동", "기배", "화산동"],
  남부: ["봉담", "향남", "비봉", "매송", "정남"],
  서부: ["남양", "서신", "팔탄", "장안", "우정", "마도", "송산"],
  북부: ["병점", "기산", "진안", "반월", "태안"],
};

const ZONE_BADGE: Record<string, string> = {
  동부: "bg-sky-100 text-sky-800",
  남부: "bg-green-100 text-green-800",
  서부: "bg-violet-100 text-violet-800",
  북부: "bg-orange-100 text-orange-800",
  기타: "bg-gray-100 text-gray-600",
};

const FREQ_LABELS: Record<string, string> = { single: "1회성", regular: "정기/연속" };
const LOC_LABELS: Record<string, string> = { offline: "대면", online: "온라인", hybrid: "혼합" };

function detectZone(address: string | null): string {
  if (!address) return "기타";
  for (const [zone, keywords] of Object.entries(ZONE_KEYWORDS)) {
    if (keywords.some((k) => address.includes(k))) return zone;
  }
  return "기타";
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminReviewPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [requests, setRequests]   = useState<ReviewRequest[]>([]);
  const [fetching, setFetching]   = useState(true);
  const [zone, setZone]           = useState<string>("all");
  const [search, setSearch]       = useState("");
  const [selected, setSelected]   = useState<ReviewRequest | null>(null);
  const [cancelMode, setCancelMode] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [toast, setToast]         = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) router.replace("/login");
  }, [loading, user, router]);

  async function fetchRequests() {
    setFetching(true);
    const data = await fetch("/api/admin/match-requests/pending").then((r) => r.json());
    setRequests(Array.isArray(data) ? data : []);
    setFetching(false);
  }

  useEffect(() => {
    if (user) fetchRequests();
  }, [user]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // 모달 열릴 때 cancel 상태 초기화
  useEffect(() => {
    if (selected) { setCancelMode(false); setCancelReason(""); }
  }, [selected?.id]);

  const filtered = useMemo(() => {
    let list = requests;
    if (zone !== "all") list = list.filter((r) => detectZone(r.address) === zone);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          (r.client?.name ?? "").toLowerCase().includes(q) ||
          (r.address ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [requests, zone, search]);

  // 권역별 카운트 (전체 requests 기준)
  const zoneCounts = useMemo(() => {
    const counts: Record<string, number> = { all: requests.length };
    for (const r of requests) {
      const z = detectZone(r.address);
      counts[z] = (counts[z] ?? 0) + 1;
    }
    return counts;
  }, [requests]);

  async function handleApprove() {
    if (!selected || processing) return;
    setProcessing(true);
    const res = await fetch(`/api/admin/match-requests/${selected.id}/approve`, { method: "PATCH" });
    if (res.ok) {
      setRequests((prev) => prev.filter((r) => r.id !== selected.id));
      setToast({ msg: `"${selected.title}" 요청이 승인되어 매칭 관리로 이관되었습니다.`, ok: true });
      setSelected(null);
    } else {
      const err = await res.json().catch(() => ({}));
      setToast({ msg: err.error ?? "승인 처리 중 오류가 발생했습니다.", ok: false });
    }
    setProcessing(false);
  }

  async function handleCancel() {
    if (!selected || processing || !cancelReason.trim()) return;
    setProcessing(true);
    const res = await fetch(`/api/admin/match-requests/${selected.id}/cancel`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: cancelReason }),
    });
    if (res.ok) {
      setRequests((prev) => prev.filter((r) => r.id !== selected.id));
      setToast({ msg: `"${selected.title}" 요청이 반려되었습니다.`, ok: true });
      setSelected(null);
    } else {
      const err = await res.json().catch(() => ({}));
      setToast({ msg: err.error ?? "반려 처리 중 오류가 발생했습니다.", ok: false });
    }
    setProcessing(false);
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
      <Head><title>교육 요청 검토 | 화성 AI 시민리더 잇다</title></Head>
      <DashboardLayout pageTitle="교육 요청 검토">

        {/* 페이지 헤더 */}
        <div className="bg-gradient-to-br from-indigo-700 to-hwaseong-blue rounded-3xl p-6 flex items-center gap-5">
          <div className="w-14 h-14 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">
            🔍
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-black text-white">교육 요청 검토 목록</h2>
            <p className="text-blue-200 text-sm mt-0.5">
              수요처에서 접수된 교육 요청을 검토하고 승인 또는 반려하세요.
            </p>
          </div>
          <div className="flex-shrink-0 text-right">
            {requests.length > 0 ? (
              <p className="text-3xl font-black text-white">{requests.length}</p>
            ) : (
              <p className="text-2xl font-black text-green-300">✓</p>
            )}
            <p className="text-blue-200 text-xs mt-0.5">
              {requests.length > 0 ? "검토 대기" : "검토 완료"}
            </p>
          </div>
        </div>

        {/* 권역 필터 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">화성시 권역 필터</p>
          <div className="flex flex-wrap gap-2">
            {ZONES.map((z) => {
              const count = zoneCounts[z.key] ?? 0;
              const active = zone === z.key;
              return (
                <button
                  key={z.key}
                  onClick={() => setZone(z.key)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    active
                      ? "bg-hwaseong-blue text-white shadow-sm"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {z.label}
                  <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                    active ? "bg-white/20 text-white" : "bg-white text-gray-500"
                  }`}>
                    {z.key === "all" ? requests.length : count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 검색 */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔎</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="교육 주제, 수요처명, 지역으로 검색"
              className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
              >✕</button>
            )}
          </div>
        </div>

        {/* 결과 헤더 */}
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-gray-500">
            {zone !== "all" || search
              ? <><span className="font-semibold text-hwaseong-text">{filtered.length}건</span> 표시 중 (전체 {requests.length}건)</>
              : <><span className="font-semibold text-hwaseong-text">{requests.length}건</span> 검토 대기 중</>
            }
          </p>
          <button
            onClick={fetchRequests}
            disabled={fetching}
            className="text-xs text-gray-400 hover:text-hwaseong-blue flex items-center gap-1 transition-colors disabled:opacity-50"
          >
            <span className={fetching ? "animate-spin inline-block" : ""}>↺</span>
            새로고침
          </button>
        </div>

        {/* 목록 */}
        {fetching ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="w-8 h-8 border-4 border-hwaseong-blue border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-400">불러오는 중...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-400">
            <p className="text-4xl mb-3">{requests.length === 0 ? "🎉" : "🔍"}</p>
            <p className="text-sm font-medium">
              {requests.length === 0
                ? "검토 대기 중인 교육 요청이 없습니다."
                : "해당 조건에 맞는 요청이 없습니다."}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* 테이블 헤더 */}
            <div className="hidden md:grid grid-cols-[2fr_1.2fr_1fr_1fr_1.2fr_auto] gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide">
              <span>교육 주제 / 수요처</span>
              <span>카테고리</span>
              <span>희망 일시</span>
              <span>지역 / 권역</span>
              <span>신청인 연락처</span>
              <span>검토</span>
            </div>

            <div className="divide-y divide-gray-50">
              {filtered.map((req, idx) => {
                const z = detectZone(req.address);
                return (
                  <div
                    key={req.id}
                    className="grid md:grid-cols-[2fr_1.2fr_1fr_1fr_1.2fr_auto] gap-3 px-5 py-4 items-center hover:bg-gray-50/60 transition-colors cursor-pointer"
                    onClick={() => setSelected(req)}
                  >
                    {/* 교육 주제 / 수요처 */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs text-gray-300">#{idx + 1}</span>
                        <p className="font-semibold text-hwaseong-text text-sm truncate">{req.title}</p>
                      </div>
                      <p className="text-xs text-gray-400 truncate">🏢 {req.client?.name ?? "—"}</p>
                    </div>

                    {/* 카테고리 */}
                    <div>
                      <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg font-medium">{req.category}</span>
                      {req.institution_type && (
                        <p className="text-[11px] text-gray-400 mt-1">{req.institution_type}</p>
                      )}
                    </div>

                    {/* 희망 일시 */}
                    <div>
                      <p className="text-sm text-hwaseong-text font-medium">{fmtDate(req.start_date)}</p>
                      {req.end_date && req.end_date !== req.start_date && (
                        <p className="text-xs text-gray-400">~ {fmtDate(req.end_date)}</p>
                      )}
                      <p className="text-[11px] text-gray-400 mt-0.5">{FREQ_LABELS[req.frequency] ?? req.frequency}</p>
                    </div>

                    {/* 지역 / 권역 */}
                    <div>
                      <p className="text-xs text-gray-600 truncate">{req.address ?? "—"}</p>
                      <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full mt-1 ${ZONE_BADGE[z]}`}>
                        {z}권
                      </span>
                    </div>

                    {/* 신청인 연락처 */}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-hwaseong-text truncate">{req.client?.name ?? "—"}</p>
                      <p className="text-xs text-gray-400 truncate">{req.client?.email ?? "—"}</p>
                      <p className="text-[11px] text-gray-300 mt-0.5">신청 {fmtDate(req.created_at)}</p>
                    </div>

                    {/* 검토 버튼 */}
                    <div onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelected(req)}
                        className="flex-shrink-0 px-3.5 py-2 bg-hwaseong-blue text-white text-xs font-bold rounded-xl hover:bg-blue-900 transition-colors"
                      >
                        검토
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </DashboardLayout>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-white text-sm font-semibold transition-all animate-fade-up max-w-sm ${
          toast.ok ? "bg-green-600" : "bg-red-500"
        }`}>
          <span>{toast.ok ? "✅" : "❌"}</span>
          <span className="flex-1">{toast.msg}</span>
          <button onClick={() => setToast(null)} className="opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* 상세 검토 모달 */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col">

            {/* 모달 헤더 */}
            <div className="p-5 border-b border-gray-100 flex items-start justify-between gap-3 flex-shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-hwaseong-blue bg-blue-50 px-2 py-0.5 rounded-full">
                    교육 요청 상세
                  </span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${ZONE_BADGE[detectZone(selected.address)]}`}>
                    {detectZone(selected.address)}권
                  </span>
                </div>
                <h3 className="font-bold text-hwaseong-text text-lg leading-tight">{selected.title}</h3>
                <p className="text-sm text-gray-400 mt-0.5">신청: {fmtDateTime(selected.created_at)}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400"
              >✕</button>
            </div>

            {/* 상세 내용 스크롤 영역 */}
            <div className="overflow-y-auto flex-1 p-5 space-y-4">

              {/* 수요처 정보 */}
              <Section title="신청 기관 / 연락처">
                <InfoRow label="수요처명" value={selected.client?.name ?? "—"} />
                <InfoRow label="이메일" value={selected.client?.email ?? "—"} mono />
                {selected.institution_type && (
                  <InfoRow label="기관 유형" value={selected.institution_type} />
                )}
              </Section>

              {/* 교육 내용 */}
              <Section title="교육 내용">
                <InfoRow label="교육 주제" value={selected.title} />
                <InfoRow label="교육 분야" value={selected.category} />
                {selected.target_age && <InfoRow label="교육 대상" value={selected.target_age} />}
                <InfoRow label="예상 참가자" value={`${selected.participant_count}명`} />
                <InfoRow label="강의 방식" value={`${FREQ_LABELS[selected.frequency] ?? selected.frequency} · ${LOC_LABELS[selected.location_type] ?? selected.location_type}`} />
              </Section>

              {/* 일정 / 장소 */}
              <Section title="일정 및 장소">
                <InfoRow label="희망 시작일" value={fmtDate(selected.start_date)} />
                {selected.end_date && (
                  <InfoRow label="종료일" value={fmtDate(selected.end_date)} />
                )}
                <InfoRow label="장소 주소" value={selected.address ?? "미입력"} />
              </Section>

              {/* 비고 */}
              {selected.notes && (
                <Section title="추가 요청사항">
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selected.notes}</p>
                </Section>
              )}

              {/* 반려 사유 입력 영역 */}
              {cancelMode && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">⚠️</span>
                    <p className="text-sm font-bold text-red-700">반려 사유 입력</p>
                  </div>
                  <p className="text-xs text-red-600">
                    사유를 입력하면 요청이 취소 처리됩니다. 수요처에 사유가 전달될 수 있습니다.
                  </p>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="반려 사유를 구체적으로 입력해주세요 (예: 교육 분야 미매칭, 일정 불가 등)"
                    rows={4}
                    className="w-full px-3 py-2.5 border border-red-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-300 bg-white resize-none"
                    autoFocus
                  />
                  <p className={`text-xs text-right ${cancelReason.length < 10 ? "text-red-400" : "text-gray-400"}`}>
                    {cancelReason.length}자 {cancelReason.length < 10 && "(최소 10자)"}
                  </p>
                </div>
              )}
            </div>

            {/* 액션 버튼 */}
            <div className="p-5 border-t border-gray-100 space-y-2 flex-shrink-0">
              {!cancelMode ? (
                <>
                  <button
                    onClick={handleApprove}
                    disabled={processing}
                    className="w-full py-3.5 bg-hwaseong-blue text-white font-bold text-sm rounded-2xl hover:bg-blue-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {processing ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : "✅"}
                    {processing ? "처리 중..." : "요청 승인 — 매칭 관리로 이관"}
                  </button>
                  <button
                    onClick={() => setCancelMode(true)}
                    disabled={processing}
                    className="w-full py-2.5 border border-red-300 text-red-600 font-semibold text-sm rounded-2xl hover:bg-red-50 transition-colors disabled:opacity-40"
                  >
                    반려 / 취소
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleCancel}
                    disabled={processing || cancelReason.trim().length < 10}
                    className="w-full py-3.5 bg-red-500 text-white font-bold text-sm rounded-2xl hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {processing ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : "🚫"}
                    {processing ? "처리 중..." : "반려 확정"}
                  </button>
                  <button
                    onClick={() => { setCancelMode(false); setCancelReason(""); }}
                    disabled={processing}
                    className="w-full py-2.5 text-sm text-gray-400 rounded-2xl hover:bg-gray-100 transition-colors"
                  >
                    돌아가기
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">{title}</p>
      <div className="bg-gray-50 rounded-2xl p-3.5 space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs text-gray-400 flex-shrink-0 w-20 pt-0.5">{label}</span>
      <span className={`text-sm text-hwaseong-text font-medium flex-1 ${mono ? "font-mono text-xs pt-0.5" : ""}`}>
        {value}
      </span>
    </div>
  );
}
