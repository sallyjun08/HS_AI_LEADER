import Head from "next/head";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/lib/auth-context";
import DashboardLayout from "@/components/DashboardLayout";

// ─── 타입 ──────────────────────────────────────────────────────────────────

type MatchingRequest = {
  id: string;
  title: string;
  category: string;
  /** 강사 매칭 시 강사의 전문 분야와 대조하는 핵심 파라미터로 사용됨 */
  target_audience: string[] | null;
  participant_count: number;
  institution_type: string | null;
  address: string | null;
  start_date: string;
  notes: string | null;
  frequency: string;
  location_type: string;
  status: "pending" | "rejected";
  prev_leader_id: string | null;
  created_at: string;
  updated_at: string;
  client: { name: string; email: string } | null;
};

type MatchingLeader = {
  id: string;
  name: string;
  isActive: boolean;
  specialties: string[];
  availableRegions: string[];
  availableTimes: Record<string, unknown> | null;
  /** 강사가 설정한 선호/특화 교육 대상 — 매칭 시 대상 적합도 점수 산정에 사용됨 */
  preferredAudiences: string[];
  bio: string | null;
  ratingAvg: number;
  totalLectures: number;
  responseRate: number;
};

type ScoredLeader = MatchingLeader & {
  matchScore: number;
  regionScore: number;
  specialtyScore: number;
  ratingScore: number;
  experienceScore: number;
  audienceScore: number;
  matchedAudiences: string[];
};

// ─── 상수 ──────────────────────────────────────────────────────────────────

const DAY_MAP: Record<string, string> = {
  mon: "월", tue: "화", wed: "수", thu: "목", fri: "금", sat: "토", sun: "일",
};

const FREQ_LABELS: Record<string, string> = { single: "1회성", regular: "정기" };
const LOC_LABELS:  Record<string, string> = { offline: "대면", online: "온라인", hybrid: "혼합" };

// ─── 헬퍼 함수 ─────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" });
}

function fmtAvailTimes(times: Record<string, unknown> | null): string {
  if (!times) return "—";
  const days = (Array.isArray(times.weekdays) ? (times.weekdays as string[]) : [])
    .map((d) => DAY_MAP[d] ?? d);
  const slots = Array.isArray(times.time_slots) ? (times.time_slots as string[])[0] : null;
  const parts = [days.length > 0 ? days.join("·") : null, slots].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "—";
}

function scoreColor(score: number): string {
  if (score >= 70) return "bg-green-500";
  if (score >= 45) return "bg-amber-400";
  return "bg-gray-300";
}

function scoreTextColor(score: number): string {
  if (score >= 70) return "text-green-600";
  if (score >= 45) return "text-amber-600";
  return "text-gray-400";
}

function calcScores(leader: MatchingLeader, req: MatchingRequest): ScoredLeader {
  const regionScore = leader.availableRegions.some(
    (r) => (req.address ?? "").includes(r) || r.includes(req.address ?? "")
  ) ? 30 : 0;

  const words = req.category.split(/[\s,]+/);
  const matched = leader.specialties.filter((s) =>
    words.some((w) => s.includes(w) || w.includes(s))
  );
  const specialtyScore  = Math.min(matched.length * 15, 40);
  const ratingScore     = Math.round((leader.ratingAvg / 5) * 20);
  const experienceScore = Math.min(leader.totalLectures, 10);

  // 대상 적합도: 수요처 교육 대상 ∩ 강사 선호 대상 (최대 +10pt)
  const reqAudiences    = req.target_audience ?? [];
  const matchedAudiences = reqAudiences.filter((a) => leader.preferredAudiences.includes(a));
  const audienceScore   = Math.min(matchedAudiences.length * 5, 10);

  return {
    ...leader,
    matchScore:     regionScore + specialtyScore + ratingScore + experienceScore + audienceScore,
    regionScore,
    specialtyScore,
    ratingScore,
    experienceScore,
    audienceScore,
    matchedAudiences,
  };
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────

export default function MatchingCenter() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [requests,  setRequests]  = useState<MatchingRequest[]>([]);
  const [leaders,   setLeaders]   = useState<MatchingLeader[]>([]);
  const [fetching,  setFetching]  = useState(true);

  const [selectedReq,    setSelectedReq]    = useState<MatchingRequest | null>(null);
  const [selectedLeaderId, setSelectedLeaderId] = useState<string | null>(null);
  const [assigning,      setAssigning]      = useState(false);
  const [hideRejected,   setHideRejected]   = useState(true);
  const [reqSearch,      setReqSearch]      = useState("");
  const [leaderSearch,   setLeaderSearch]   = useState("");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // 강사 선택 초기화 (요청 변경 시)
  useEffect(() => {
    setSelectedLeaderId(null);
    setLeaderSearch("");
  }, [selectedReq?.id]);

  async function fetchAll() {
    setFetching(true);
    const [reqData, ldData] = await Promise.all([
      fetch("/api/admin/matching-center/requests").then((r) => r.json()),
      fetch("/api/admin/matching-center/leaders").then((r) => r.json()),
    ]);
    setRequests(Array.isArray(reqData) ? reqData : []);
    setLeaders(Array.isArray(ldData)  ? ldData  : []);
    setFetching(false);
  }

  useEffect(() => {
    if (user) fetchAll();
  }, [user]);

  // ── 파생 상태 ────────────────────────────────────────────────────────────

  const rejectedReqs = useMemo(
    () => requests.filter((r) => r.status === "rejected"),
    [requests]
  );
  const pendingReqs = useMemo(
    () => requests.filter((r) => r.status === "pending"),
    [requests]
  );

  const filteredReqs = useMemo(() => {
    if (!reqSearch.trim()) return requests;
    const q = reqSearch.toLowerCase();
    return requests.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        (r.client?.name ?? "").toLowerCase().includes(q) ||
        (r.address ?? "").toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
    );
  }, [requests, reqSearch]);

  const scoredLeaders = useMemo((): ScoredLeader[] => {
    if (!selectedReq) return [];
    return leaders
      .map((l) => calcScores(l, selectedReq))
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [selectedReq, leaders]);

  const displayedLeaders = useMemo(() => {
    let list = scoredLeaders;
    if (hideRejected && selectedReq?.prev_leader_id) {
      list = list.filter((l) => l.id !== selectedReq.prev_leader_id);
    }
    if (leaderSearch.trim()) {
      const q = leaderSearch.toLowerCase();
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.specialties.some((s) => s.toLowerCase().includes(q)) ||
          l.availableRegions.some((r) => r.toLowerCase().includes(q))
      );
    }
    return list;
  }, [scoredLeaders, hideRejected, selectedReq, leaderSearch]);

  const prevLeader = useMemo(
    () => selectedReq?.prev_leader_id
      ? scoredLeaders.find((l) => l.id === selectedReq.prev_leader_id)
      : null,
    [selectedReq, scoredLeaders]
  );

  const selectedLeader = useMemo(
    () => scoredLeaders.find((l) => l.id === selectedLeaderId) ?? null,
    [scoredLeaders, selectedLeaderId]
  );

  // ── 배정 실행 ────────────────────────────────────────────────────────────

  async function handleAssign() {
    if (!selectedReq || !selectedLeaderId || assigning) return;
    setAssigning(true);
    const leader = selectedLeader;
    const res = await fetch(`/api/admin/match-requests/${selectedReq.id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leaderId:        selectedLeaderId,
        matchScore:      leader?.matchScore      ?? 0,
        regionScore:     leader?.regionScore     ?? 0,
        specialtyScore:  leader?.specialtyScore  ?? 0,
        ratingScore:     leader?.ratingScore     ?? 0,
        experienceScore: leader?.experienceScore ?? 0,
      }),
    });
    if (res.ok) {
      setRequests((prev) => prev.filter((r) => r.id !== selectedReq.id));
      setToast({ msg: `"${selectedReq.title}"에 ${leader?.name ?? ""} 강사를 배정했습니다.`, ok: true });
      setSelectedReq(null);
    } else {
      const err = await res.json().catch(() => ({}));
      setToast({ msg: err.error ?? "배정 중 오류가 발생했습니다.", ok: false });
    }
    setAssigning(false);
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
      <Head><title>강사 매칭 센터 | 화성 AI 시민리더 잇다</title></Head>
      <DashboardLayout pageTitle="강사 매칭 센터">

        {/* ── 페이지 헤더 ──────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-hwaseong-blue to-indigo-700 rounded-3xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">🎯</div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-black text-white">강사 매칭 센터</h2>
            <p className="text-blue-200 text-xs mt-0.5">요청을 선택하면 적합한 인증 강사를 자동 추천합니다.</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {rejectedReqs.length > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                재배정 {rejectedReqs.length}건
              </span>
            )}
            {pendingReqs.length > 0 && (
              <span className="bg-amber-400 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                대기 {pendingReqs.length}건
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

        {/* ── 2분할 패널 ───────────────────────────────────────── */}
        <div
          className="grid gap-4 min-h-0"
          style={{ gridTemplateColumns: "2fr 3fr", height: "calc(100vh - 285px)" }}
        >
          {/* ──────────── 좌측: 요청 목록 ──────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">

            {/* 패널 헤더 */}
            <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex-shrink-0 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-hwaseong-text text-sm">매칭 대기 목록</h3>
                  <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{requests.length}</span>
                </div>
                <div className="flex gap-1">
                  {rejectedReqs.length > 0 && (
                    <span className="text-[11px] bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">⚠️ {rejectedReqs.length}</span>
                  )}
                  <span className="text-[11px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">📥 {pendingReqs.length}</span>
                </div>
              </div>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
                <input
                  type="text"
                  value={reqSearch}
                  onChange={(e) => setReqSearch(e.target.value)}
                  placeholder="요청 검색 (제목·기관·지역)"
                  className="w-full pl-7 pr-7 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30"
                />
                {reqSearch && (
                  <button onClick={() => setReqSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 text-xs">✕</button>
                )}
              </div>
            </div>

            {/* 스크롤 요청 리스트 */}
            <div className="overflow-y-auto flex-1 p-3 space-y-1.5">
              {fetching ? (
                <div className="flex items-center justify-center h-32 text-gray-300 text-sm">로딩 중...</div>
              ) : filteredReqs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-gray-300">
                  <p className="text-3xl mb-1">🎉</p>
                  <p className="text-xs">{requests.length === 0 ? "매칭 대기 요청이 없습니다" : "검색 결과 없음"}</p>
                </div>
              ) : (
                <>
                  {/* 재배정 섹션 */}
                  {filteredReqs.some((r) => r.status === "rejected") && (
                    <>
                      <div className="flex items-center gap-1.5 px-1 py-1">
                        <span className="text-xs font-bold text-red-600">⚠️ 재배정 필요</span>
                        <span className="text-[10px] bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-full">
                          {filteredReqs.filter((r) => r.status === "rejected").length}
                        </span>
                      </div>
                      {filteredReqs.filter((r) => r.status === "rejected").map((req) => (
                        <RequestCard
                          key={req.id}
                          req={req}
                          isSelected={selectedReq?.id === req.id}
                          onSelect={() => setSelectedReq(selectedReq?.id === req.id ? null : req)}
                        />
                      ))}
                      {filteredReqs.some((r) => r.status === "pending") && (
                        <div className="border-t border-gray-100 my-2" />
                      )}
                    </>
                  )}

                  {/* 대기 섹션 */}
                  {filteredReqs.some((r) => r.status === "pending") && (
                    <>
                      <div className="flex items-center gap-1.5 px-1 py-1">
                        <span className="text-xs font-bold text-amber-600">📥 매칭 대기</span>
                        <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-full">
                          {filteredReqs.filter((r) => r.status === "pending").length}
                        </span>
                      </div>
                      {filteredReqs.filter((r) => r.status === "pending").map((req) => (
                        <RequestCard
                          key={req.id}
                          req={req}
                          isSelected={selectedReq?.id === req.id}
                          onSelect={() => setSelectedReq(selectedReq?.id === req.id ? null : req)}
                        />
                      ))}
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ──────────── 우측: 강사 목록 ──────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">

            {!selectedReq ? (
              /* 빈 상태 */
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-300">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-4xl mb-4">🎯</div>
                <p className="text-base font-bold text-gray-400 mb-1">요청을 선택하세요</p>
                <p className="text-sm">좌측 목록에서 매칭할 교육 요청을 클릭하면<br />적합한 인증 강사를 자동으로 추천합니다.</p>
                <div className="mt-6 flex flex-col gap-2 text-xs text-gray-300">
                  <span>🟢 초록 점수 — 70점 이상 (최적 매칭)</span>
                  <span>🟡 노란 점수 — 45점 이상 (적합)</span>
                  <span>⚪ 회색 점수 — 44점 이하 (낮은 매칭)</span>
                </div>
              </div>
            ) : (
              <>
                {/* 요청 요약 헤더 */}
                <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex-shrink-0 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        {selectedReq.status === "rejected" ? (
                          <span className="text-[11px] bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">⚠️ 재배정</span>
                        ) : (
                          <span className="text-[11px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">📥 신규</span>
                        )}
                        <span className="text-[11px] text-gray-400">{selectedReq.client?.name}</span>
                      </div>
                      <h3 className="font-bold text-hwaseong-text text-sm leading-tight">{selectedReq.title}</h3>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg">{selectedReq.category}</span>
                        {selectedReq.address && (
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg">📍 {selectedReq.address}</span>
                        )}
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg">📅 {fmtDate(selectedReq.start_date)}</span>
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg">👥 {selectedReq.participant_count}명</span>
                        {selectedReq.location_type && (
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-lg">{LOC_LABELS[selectedReq.location_type] ?? selectedReq.location_type}</span>
                        )}
                        {selectedReq.target_audience && selectedReq.target_audience.length > 0 && selectedReq.target_audience.map((a) => (
                          <span key={a} className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-lg">🎓 {a}</span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedReq(null)}
                      className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 text-xs"
                    >✕</button>
                  </div>

                  {/* 대상 적합도 알림 (강사 선택 시) */}
                  {selectedLeader && selectedLeader.audienceScore > 0 && (
                    <div className="bg-purple-50 border border-purple-200 rounded-xl px-3 py-2 flex items-center gap-2">
                      <span className="text-sm flex-shrink-0">🎓</span>
                      <p className="text-xs text-purple-700 font-semibold">
                        선택 강사가 수요처 교육 대상 {selectedLeader.matchedAudiences.length}개와 일치합니다
                        <span className="ml-1.5 text-purple-500 font-bold">(+{selectedLeader.audienceScore}pt 가산)</span>
                      </p>
                    </div>
                  )}

                  {/* 이전 거절 강사 안내 */}
                  {prevLeader || selectedReq.prev_leader_id ? (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs">⚠️</span>
                        <p className="text-xs text-red-700 font-semibold">
                          이전 거절: {prevLeader?.name ?? "강사 정보 없음"}
                        </p>
                      </div>
                      <button
                        onClick={() => setHideRejected(!hideRejected)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg transition-colors ${
                          hideRejected
                            ? "bg-red-200 text-red-700 hover:bg-red-300"
                            : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                        }`}
                      >
                        {hideRejected ? "목록에서 제외 중" : "전체 표시 중"}
                      </button>
                    </div>
                  ) : null}

                  {/* 강사 검색 */}
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
                    <input
                      type="text"
                      value={leaderSearch}
                      onChange={(e) => setLeaderSearch(e.target.value)}
                      placeholder={`강사 이름·전문분야·지역 검색 (${displayedLeaders.length}명)`}
                      className="w-full pl-7 pr-7 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30"
                    />
                    {leaderSearch && (
                      <button onClick={() => setLeaderSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 text-xs">✕</button>
                    )}
                  </div>
                </div>

                {/* 스크롤 강사 리스트 */}
                <div className="overflow-y-auto flex-1 p-3 space-y-2">
                  {displayedLeaders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-gray-300 text-sm">
                      <p className="text-2xl mb-1">🏅</p>
                      <p className="text-xs">
                        {leaderSearch ? "검색 결과가 없습니다." : "배정 가능한 강사가 없습니다."}
                      </p>
                    </div>
                  ) : (
                    displayedLeaders.map((leader) => (
                      <LeaderCard
                        key={leader.id}
                        leader={leader}
                        isSelected={selectedLeaderId === leader.id}
                        isPrevRejector={leader.id === selectedReq.prev_leader_id}
                        onSelect={() => setSelectedLeaderId(
                          selectedLeaderId === leader.id ? null : leader.id
                        )}
                      />
                    ))
                  )}
                </div>

                {/* 하단 배정 바 */}
                <div className={`border-t border-gray-100 flex-shrink-0 transition-all ${selectedLeaderId ? "p-4" : "p-3"}`}>
                  {selectedLeader ? (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500">선택된 강사</p>
                        <p className="text-sm font-bold text-hwaseong-text truncate">
                          {selectedLeader.name}
                          <span className={`ml-2 text-xs font-semibold ${scoreTextColor(selectedLeader.matchScore)}`}>
                            {selectedLeader.matchScore}점
                          </span>
                        </p>
                      </div>
                      <button
                        onClick={handleAssign}
                        disabled={assigning}
                        className="flex-shrink-0 px-5 py-2.5 bg-hwaseong-blue text-white text-sm font-bold rounded-xl hover:bg-blue-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {assigning ? (
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : "🎯"}
                        {assigning ? "배정 중..." : "배정하기"}
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 text-center py-1">강사 카드를 클릭하여 선택하세요</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

      </DashboardLayout>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-white text-sm font-semibold animate-fade-up max-w-sm ${
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

// ─── 요청 카드 ─────────────────────────────────────────────────────────────

function RequestCard({
  req,
  isSelected,
  onSelect,
}: {
  req: MatchingRequest;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const isRejected = req.status === "rejected";
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-xl p-3 border-2 transition-all ${
        isSelected
          ? isRejected
            ? "border-red-500 bg-red-50 shadow-sm"
            : "border-hwaseong-blue bg-blue-50 shadow-sm"
          : isRejected
            ? "border-red-300 bg-red-50/40 hover:border-red-400"
            : "border-transparent bg-gray-50 hover:border-gray-200"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="text-xs font-bold text-hwaseong-text leading-tight flex-1 line-clamp-2">
          {req.title}
        </p>
        {isSelected && (
          <span className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isRejected ? "bg-red-500 text-white" : "bg-hwaseong-blue text-white"}`}>
            선택됨
          </span>
        )}
      </div>
      <p className="text-[11px] text-gray-400 mb-2 truncate">🏢 {req.client?.name ?? "—"}</p>
      <div className="flex flex-wrap gap-1">
        <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{req.category}</span>
        {req.address && (
          <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded truncate max-w-[100px]">📍 {req.address}</span>
        )}
        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">📅 {req.start_date}</span>
        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">👥 {req.participant_count}명</span>
        {req.target_audience && req.target_audience.length > 0 && (
          <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">
            🎓 {req.target_audience.slice(0, 2).join("·")}{req.target_audience.length > 2 ? ` +${req.target_audience.length - 2}` : ""}
          </span>
        )}
      </div>
      {isRejected && (
        <p className="text-[10px] text-red-500 font-semibold mt-1.5">
          {req.prev_leader_id ? "이전 강사가 거절함 · 재배정 필요" : "강사 거절 · 재배정 필요"}
        </p>
      )}
    </button>
  );
}

// ─── 강사 카드 ─────────────────────────────────────────────────────────────

function LeaderCard({
  leader,
  isSelected,
  isPrevRejector,
  onSelect,
}: {
  leader: ScoredLeader;
  isSelected: boolean;
  isPrevRejector: boolean;
  onSelect: () => void;
}) {
  return (
    <div className="relative">
      <button
        onClick={onSelect}
        className={`w-full text-left rounded-2xl p-4 border-2 transition-all ${
          isPrevRejector
            ? "opacity-40 grayscale border-transparent bg-gray-100 cursor-not-allowed"
            : isSelected
              ? "border-hwaseong-blue bg-blue-50 shadow-sm"
              : "border-transparent bg-gray-50 hover:border-gray-200 hover:bg-gray-100"
        }`}
        disabled={isPrevRejector}
      >
        {/* 헤더: 이름 + 등급 + 활성 */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors ${
              isSelected ? "bg-hwaseong-blue text-white" : "bg-hwaseong-blue/10 text-hwaseong-blue"
            }`}>
              {isSelected ? "✓" : leader.name[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-hwaseong-text truncate">{leader.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                {!leader.isActive && (
                  <span className="text-[10px] bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">비활성</span>
                )}
              </div>
            </div>
          </div>

          {/* 매칭 점수 */}
          <div className="text-right flex-shrink-0">
            <p className={`text-lg font-black leading-none ${scoreTextColor(leader.matchScore)}`}>
              {leader.matchScore}
            </p>
            <p className="text-[10px] text-gray-400">/ 110점</p>
          </div>
        </div>

        {/* 점수 바 */}
        <div className="mb-3">
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${scoreColor(leader.matchScore)}`}
              style={{ width: `${Math.min(Math.round(leader.matchScore / 110 * 100), 100)}%` }}
            />
          </div>
          {isSelected && (
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-[10px] text-gray-400">
              <span>지역 {leader.regionScore}pt</span>
              <span>분야 {leader.specialtyScore}pt</span>
              <span>평점 {leader.ratingScore}pt</span>
              <span>경험 {leader.experienceScore}pt</span>
              {leader.audienceScore > 0 && (
                <span className="text-purple-600 font-bold">대상 +{leader.audienceScore}pt</span>
              )}
            </div>
          )}
        </div>

        {/* 대상 적합도 배지 (선택 시 & 일치하는 대상이 있을 때) */}
        {isSelected && leader.audienceScore > 0 && (
          <div className="mb-2 px-2.5 py-2 bg-purple-50 border border-purple-100 rounded-xl">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-[10px] font-black text-purple-600">🎓 대상 적합도</span>
              <span className="text-[10px] font-black text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded-full">
                +{leader.audienceScore}pt
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {leader.matchedAudiences.map((a) => (
                <span key={a} className="text-[10px] bg-purple-100 text-purple-700 font-semibold px-1.5 py-0.5 rounded">
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 평점 + 강의 횟수 */}
        <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
          <span className="font-semibold text-amber-500">⭐ {leader.ratingAvg.toFixed(1)}</span>
          <span>강의 {leader.totalLectures}회</span>
          <span>응답률 {Math.round(leader.responseRate * 100)}%</span>
        </div>

        {/* 전문 분야 태그 */}
        {leader.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1.5">
            {leader.specialties.slice(0, 4).map((s) => (
              <span key={s} className={`text-[10px] px-1.5 py-0.5 rounded ${
                isSelected ? "bg-blue-200 text-blue-800" : "bg-blue-50 text-blue-700"
              }`}>{s}</span>
            ))}
            {leader.specialties.length > 4 && (
              <span className="text-[10px] text-gray-400">+{leader.specialties.length - 4}</span>
            )}
          </div>
        )}

        {/* 활동 지역 */}
        {leader.availableRegions.length > 0 && (
          <p className="text-[11px] text-gray-400 truncate">
            📍 {leader.availableRegions.slice(0, 3).join(" · ")}
            {leader.availableRegions.length > 3 && ` +${leader.availableRegions.length - 3}`}
          </p>
        )}

        {/* 가용 시간 */}
        {leader.availableTimes && (
          <p className="text-[11px] text-gray-400 mt-0.5">
            🕐 {fmtAvailTimes(leader.availableTimes)}
          </p>
        )}
      </button>

      {/* 이전 거절 배지 (오버레이) */}
      {isPrevRejector && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-2xl">
          <div className="bg-red-600/90 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg">
            이전 거절 강사
          </div>
        </div>
      )}
    </div>
  );
}
