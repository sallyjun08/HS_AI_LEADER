import Head from "next/head";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/lib/auth-context";
import DashboardLayout from "@/components/DashboardLayout";

const CERT_LEVELS: Record<number, { label: string; color: string }> = {
  1: { label: "Lv.1 기초",  color: "bg-sky-100 text-sky-800" },
  2: { label: "Lv.2 리더",  color: "bg-indigo-100 text-indigo-800" },
  3: { label: "Lv.3 전문",  color: "bg-purple-100 text-purple-800" },
};

type AdminLeader = {
  id: string;
  userId: string;
  name: string;
  email: string;
  joinedAt: string;
  certLevel: number;
  certNumber: string | null;
  certImageUrl: string | null;
  isVerified: boolean;
  isActive: boolean;
  specialties: string[];
  availableRegions: string[];
  bio: string | null;
  ratingAvg: number;
  totalLectures: number;
};

export default function AdminLeadersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [leaders, setLeaders] = useState<AdminLeader[]>([]);
  const [fetching, setFetching] = useState(true);
  const [tab, setTab] = useState<"pending" | "verified">("pending");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AdminLeader | null>(null);

  // Modal action states
  const [certDraft, setCertDraft] = useState(1);
  const [savingVerify, setSavingVerify] = useState(false);
  const [savingActive, setSavingActive] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) router.replace("/login");
  }, [loading, user, router]);

  async function fetchLeaders() {
    setFetching(true);
    const data = await fetch("/api/admin/leaders/list").then((r) => r.json());
    setLeaders(Array.isArray(data) ? data : []);
    setFetching(false);
  }

  useEffect(() => {
    if (user) fetchLeaders();
  }, [user]);

  // Sync cert draft when modal opens
  useEffect(() => {
    if (selected) { setCertDraft(selected.certLevel); setActionMsg(null); }
  }, [selected?.id]);

  const filtered = useMemo(() => {
    const byTab = leaders.filter((l) => (tab === "pending" ? !l.isVerified : l.isVerified));
    if (!search.trim()) return byTab;
    const q = search.toLowerCase();
    return byTab.filter((l) => l.name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q));
  }, [leaders, tab, search]);

  const pendingCount  = leaders.filter((l) => !l.isVerified).length;
  const verifiedCount = leaders.filter((l) =>  l.isVerified).length;
  const activeCount   = leaders.filter((l) =>  l.isVerified && l.isActive).length;

  async function handleVerify(isVerified: boolean, certLevel?: number) {
    if (!selected) return;
    setSavingVerify(true);
    setActionMsg(null);
    const res = await fetch(`/api/admin/leaders/${selected.id}/verify`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isVerified, ...(certLevel !== undefined && { certLevel }) }),
    });
    if (res.ok) {
      setActionMsg(isVerified ? "인증이 승인되었습니다." : "인증이 취소되었습니다.");
      await fetchLeaders();
      setSelected((prev) => prev ? { ...prev, isVerified, certLevel: certLevel ?? prev.certLevel } : null);
    }
    setSavingVerify(false);
  }

  async function handleToggleActive(isActive: boolean) {
    if (!selected) return;
    setSavingActive(true);
    setActionMsg(null);
    const res = await fetch(`/api/admin/leaders/${selected.id}/active`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    if (res.ok) {
      setActionMsg(isActive ? "활동이 재개되었습니다." : "매칭 후보에서 제외되었습니다.");
      await fetchLeaders();
      setSelected((prev) => prev ? { ...prev, isActive } : null);
    }
    setSavingActive(false);
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
      <Head><title>강사 관리 | 화성 AI 시민리더 잇다</title></Head>
      <DashboardLayout pageTitle="강사 관리">

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "인증 대기",  value: pendingCount,  icon: "⏳", color: "bg-amber-500" },
            { label: "인증 완료",  value: verifiedCount, icon: "🏅", color: "bg-hwaseong-blue" },
            { label: "매칭 활성",  value: activeCount,   icon: "✅", color: "bg-green-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
              <div className={`w-10 h-10 ${s.color} rounded-xl flex items-center justify-center text-lg flex-shrink-0`}>{s.icon}</div>
              <div>
                <p className="text-2xl font-black text-hwaseong-text leading-none">{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs + Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-1 bg-gray-100 rounded-2xl p-1">
            <TabBtn active={tab === "pending"}  onClick={() => setTab("pending")}  count={pendingCount}>
              ⏳ 인증 대기
            </TabBtn>
            <TabBtn active={tab === "verified"} onClick={() => setTab("verified")} count={verifiedCount}>
              🏅 인증 완료
            </TabBtn>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름 또는 이메일 검색"
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30"
          />
        </div>

        {/* Leader list */}
        {fetching ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-hwaseong-blue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 text-gray-400">
            <p className="text-4xl mb-3">{tab === "pending" ? "🎉" : "🏅"}</p>
            <p className="text-sm font-medium">
              {search ? "검색 결과가 없습니다." : tab === "pending" ? "인증 대기 강사가 없습니다." : "인증된 강사가 없습니다."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((leader) => (
              <LeaderCard key={leader.id} leader={leader} onClick={() => setSelected(leader)} />
            ))}
          </div>
        )}

      </DashboardLayout>

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">

            {/* Modal header */}
            <div className="p-5 border-b border-gray-100 flex items-center gap-3">
              <div className="w-12 h-12 bg-hwaseong-blue/10 rounded-xl flex items-center justify-center text-xl font-black text-hwaseong-blue flex-shrink-0">
                {selected.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-hwaseong-text">{selected.name}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CERT_LEVELS[selected.certLevel]?.color ?? "bg-gray-100 text-gray-500"}`}>
                    {CERT_LEVELS[selected.certLevel]?.label}
                  </span>
                  {selected.isVerified
                    ? <span className="text-[10px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">✓ 인증</span>
                    : <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">대기 중</span>
                  }
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${selected.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>
                    {selected.isActive ? "● 활동 중" : "○ 활동 중단"}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{selected.email}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-4">

              {/* Cert image preview */}
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-2">자격증 이미지</p>
                {selected.certImageUrl ? (
                  <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selected.certImageUrl}
                      alt="자격증"
                      className="w-full max-h-52 object-contain"
                    />
                  </div>
                ) : (
                  <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 h-28 flex flex-col items-center justify-center gap-1 text-gray-400">
                    <span className="text-2xl">📄</span>
                    <p className="text-xs">업로드된 자격증 이미지가 없습니다.</p>
                    {selected.certNumber && (
                      <p className="text-[10px] text-gray-400">자격증 번호: {selected.certNumber}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { label: "가입일",    value: fmtDate(selected.joinedAt) },
                  { label: "강의 횟수", value: `${selected.totalLectures}회` },
                  { label: "평균 평점", value: `⭐ ${selected.ratingAvg.toFixed(1)}` },
                  { label: "활동 지역", value: selected.availableRegions.join(", ") || "-" },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-xl px-3 py-2.5">
                    <p className="text-gray-400 mb-0.5">{label}</p>
                    <p className="font-semibold text-hwaseong-text">{value}</p>
                  </div>
                ))}
              </div>

              {/* Specialties */}
              {selected.specialties.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">전문 분야</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.specialties.map((s) => (
                      <span key={s} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Bio */}
              {selected.bio && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1">자기소개</p>
                  <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-3">{selected.bio}</p>
                </div>
              )}

              {/* Action msg */}
              {actionMsg && (
                <div className="bg-green-50 border border-green-200 text-green-700 text-xs font-semibold px-4 py-2.5 rounded-xl">
                  ✅ {actionMsg}
                </div>
              )}

              {/* Cert level selector */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                <p className="text-xs font-bold text-gray-700">자격 등급 설정</p>
                <div className="flex gap-2">
                  {([1, 2, 3] as const).map((lv) => (
                    <button
                      key={lv}
                      onClick={() => setCertDraft(lv)}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl border-2 transition-all ${
                        certDraft === lv
                          ? "border-hwaseong-blue bg-hwaseong-blue text-white"
                          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {CERT_LEVELS[lv].label}
                    </button>
                  ))}
                </div>
                {certDraft !== selected.certLevel && (
                  <button
                    onClick={() => handleVerify(selected.isVerified, certDraft)}
                    disabled={savingVerify}
                    className="w-full py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {savingVerify ? "저장 중..." : "등급 변경 저장"}
                  </button>
                )}
              </div>

              {/* Verify action */}
              <div className="flex gap-2">
                {!selected.isVerified ? (
                  <button
                    onClick={() => handleVerify(true, certDraft)}
                    disabled={savingVerify}
                    className="flex-1 py-3 bg-hwaseong-blue text-white text-sm font-bold rounded-xl hover:bg-blue-900 transition-colors disabled:opacity-50"
                  >
                    {savingVerify ? "처리 중..." : "✓ 인증 승인"}
                  </button>
                ) : (
                  <button
                    onClick={() => handleVerify(false)}
                    disabled={savingVerify}
                    className="flex-1 py-3 border-2 border-red-300 text-red-500 text-sm font-bold rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {savingVerify ? "처리 중..." : "✕ 인증 취소"}
                  </button>
                )}
              </div>

              {/* Active toggle */}
              <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-hwaseong-text">매칭 후보 노출</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {selected.isActive ? "현재 매칭 후보에 포함됩니다." : "현재 매칭 후보에서 제외됩니다."}
                  </p>
                </div>
                <button
                  onClick={() => handleToggleActive(!selected.isActive)}
                  disabled={savingActive}
                  className={`relative w-12 h-6 rounded-full transition-colors disabled:opacity-50 ${
                    selected.isActive ? "bg-green-500" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      selected.isActive ? "translate-x-7" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

            </div>

            <div className="p-4 border-t border-gray-100">
              <button
                onClick={() => setSelected(null)}
                className="w-full py-2.5 text-sm text-gray-500 rounded-xl hover:bg-gray-100 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function LeaderCard({ leader, onClick }: { leader: AdminLeader; onClick: () => void }) {
  const cl = CERT_LEVELS[leader.certLevel];
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:border-hwaseong-blue/40 hover:shadow-md transition-all group"
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 bg-hwaseong-blue/10 rounded-xl flex items-center justify-center text-base font-black text-hwaseong-blue flex-shrink-0">
          {leader.name[0]}
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="font-semibold text-hwaseong-text text-sm">{leader.name}</p>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cl?.color ?? "bg-gray-100 text-gray-500"}`}>
              {cl?.label}
            </span>
            {leader.isVerified && (
              <span className="text-[10px] bg-green-100 text-green-700 font-bold px-1.5 py-0.5 rounded-full">✓ 인증</span>
            )}
            {!leader.isActive && (
              <span className="text-[10px] bg-gray-100 text-gray-400 font-bold px-1.5 py-0.5 rounded-full">활동 중단</span>
            )}
          </div>
          <p className="text-xs text-gray-400 truncate">{leader.email}</p>
          {leader.specialties.length > 0 && (
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {leader.specialties.slice(0, 3).map((s) => (
                <span key={s} className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{s}</span>
              ))}
              {leader.specialties.length > 3 && (
                <span className="text-[10px] text-gray-400">+{leader.specialties.length - 3}</span>
              )}
            </div>
          )}
        </div>

        {/* Right meta */}
        <div className="text-right flex-shrink-0 text-xs text-gray-400 space-y-0.5">
          <p>가입 {fmtDate(leader.joinedAt)}</p>
          <p>강의 {leader.totalLectures}회</p>
          <p className="text-amber-500 font-semibold">⭐ {leader.ratingAvg.toFixed(1)}</p>
        </div>

        <span className="text-gray-300 group-hover:text-hwaseong-blue transition-colors ml-1">›</span>
      </div>
    </button>
  );
}

function TabBtn({
  active, onClick, count, children,
}: {
  active: boolean; onClick: () => void; count: number; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all flex items-center gap-1.5 ${
        active ? "bg-white text-hwaseong-blue shadow-sm" : "text-gray-500 hover:text-gray-700"
      }`}
    >
      {children}
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? "bg-hwaseong-blue text-white" : "bg-gray-200 text-gray-500"}`}>
        {count}
      </span>
    </button>
  );
}

function fmtDate(iso: string): string {
  if (!iso) return "-";
  return iso.slice(0, 10).replace(/-/g, ".");
}
