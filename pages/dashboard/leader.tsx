import Head from "next/head";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/lib/auth-context";
import DashboardLayout from "@/components/DashboardLayout";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const CERT_LABELS: Record<number, string> = { 1: "AI 기초 이수", 2: "AI 시민 리더", 3: "AI 전문 강사" };

type MatchRequest = {
  id: string;
  title: string;
  category: string;
  target_age: string | null;
  participant_count: number;
  start_date: string;
  address: string | null;
  status: string;
  client: { name: string } | null;
};

type Report = {
  id: string;
  match_id: string;
  lecture_date: string;
  attendance_count: number;
  report_text: string | null;
  rating_from_client: number | null;
  submitted_at: string;
  match: { title: string; address: string | null } | null;
};

type ProfileForm = { bio: string; specialties: string; availableRegions: string; phone: string };

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-amber-400 text-sm">
      {"★".repeat(Math.floor(rating))}
      {rating % 1 >= 0.5 ? "½" : ""}
      <span className="text-gray-200">{"★".repeat(5 - Math.ceil(rating))}</span>
    </span>
  );
}

export default function LeaderDashboard() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"overview" | "matches" | "reports" | "profile">("overview");
  const [matches, setMatches] = useState<MatchRequest[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [profileForm, setProfileForm] = useState<ProfileForm>({ bio: "", specialties: "", availableRegions: "", phone: "" });
  const [reportForm, setReportForm] = useState({ matchId: "", lectureDate: "", attendeeCount: "", reportText: "" });
  const [saving, setSaving] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== "leader")) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/match-requests").then((r) => r.json()).then(setMatches).catch(() => {});
    fetch("/api/activity-reports").then((r) => r.json()).then(setReports).catch(() => {});
    if (user.leaderProfile) {
      setProfileForm({
        bio: "",
        specialties: user.leaderProfile.specialties.join(", "),
        availableRegions: user.leaderProfile.availableRegions.join(", "),
        phone: "",
      });
    }
  }, [user]);

  async function refreshMatches() {
    const updated = await fetch("/api/match-requests").then((r) => r.json());
    setMatches(updated);
  }

  async function acceptMatch(matchId: string) {
    setActionInProgress(matchId);
    const res = await fetch(`/api/match-requests/${matchId}/accept`, { method: "PATCH" });
    if (res.ok) await refreshMatches();
    setActionInProgress(null);
  }

  async function rejectMatch(matchId: string) {
    setActionInProgress(matchId);
    const res = await fetch(`/api/match-requests/${matchId}/reject`, { method: "POST" });
    if (res.ok) await refreshMatches();
    setActionInProgress(null);
  }

  async function saveProfile() {
    setSaving(true);
    try {
      const specialties = profileForm.specialties.split(",").map((s) => s.trim()).filter(Boolean);
      const availableRegions = profileForm.availableRegions.split(",").map((a) => a.trim()).filter(Boolean);
      await fetch("/api/leaders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: profileForm.bio, specialties, availableRegions, phone: profileForm.phone }),
      });
    } finally {
      setSaving(false);
    }
  }

  async function submitReport(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingReport(true);
    try {
      const res = await fetch("/api/activity-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: reportForm.matchId,
          lectureDate: reportForm.lectureDate,
          attendeeCount: Number(reportForm.attendeeCount),
          reportText: reportForm.reportText,
        }),
      });
      if (res.ok) {
        const updated = await fetch("/api/activity-reports").then((r) => r.json());
        setReports(updated);
        setReportForm({ matchId: "", lectureDate: "", attendeeCount: "", reportText: "" });
      }
    } finally {
      setSubmittingReport(false);
    }
  }

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-hwaseong-blue border-t-transparent rounded-full animate-spin" /></div>;
  }

  const lp = user.leaderProfile;
  const totalAttendees = reports.reduce((s, r) => s + r.attendance_count, 0);
  const ratedReports = reports.filter((r) => r.rating_from_client !== null);
  const avgRating = ratedReports.length
    ? (ratedReports.reduce((s, r) => s + (r.rating_from_client ?? 0), 0) / ratedReports.length).toFixed(1)
    : "-";

  const pendingMatches = matches.filter((m) => m.status === "matched");
  const activeMatches = matches.filter((m) => ["matched", "ongoing"].includes(m.status));
  const submittedMatchIds = new Set(reports.map((r) => r.match_id));
  const eligibleMatches = activeMatches.filter((m) => !submittedMatchIds.has(m.id));

  const monthlyData = reports.reduce<Record<string, number>>((acc, r) => {
    const key = r.lecture_date.slice(0, 7);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const chartData = Object.entries(monthlyData).map(([month, count]) => ({ month, count })).sort((a, b) => a.month.localeCompare(b.month));

  return (
    <>
      <Head><title>AI 시민 리더 대시보드 | 화성 AI 시민리더 잇다</title></Head>
      <DashboardLayout pageTitle="AI 시민 리더 대시보드">

        {/* 프로필 히어로 */}
        <div className="bg-gradient-to-br from-hwaseong-blue via-[#003fa3] to-indigo-700 rounded-3xl overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 bg-white/20 border-2 border-white/40 rounded-2xl flex items-center justify-center text-4xl font-black text-white">
                  {user.name[0]}
                </div>
                {lp?.isVerified && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 rounded-full border-2 border-white flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-black text-white">{user.name}</h2>
                <p className="text-blue-200 text-sm mb-3">
                  {lp ? CERT_LABELS[lp.certLevel] : "강사"} · {lp?.isVerified ? "화성특례시 공식 인증" : "인증 대기 중"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {lp?.specialties.slice(0, 3).map((s) => (
                    <span key={s} className="text-xs bg-white/10 text-blue-100 border border-white/20 px-2.5 py-1 rounded-full">{s}</span>
                  ))}
                  {!lp?.isVerified && (
                    <span className="text-xs bg-amber-400/20 text-amber-200 border border-amber-400/30 px-2.5 py-1 rounded-full">인증 신청 필요</span>
                  )}
                </div>
              </div>
              <button onClick={signOut} className="text-xs bg-white/10 border border-white/30 text-white px-4 py-2 rounded-xl hover:bg-white/20 transition-colors flex-shrink-0">
                로그아웃
              </button>
            </div>
          </div>
          <div className="bg-black/20 border-t border-white/10 grid grid-cols-4 divide-x divide-white/10">
            {[
              { label: "총 강의", value: `${reports.length}회` },
              { label: "누적 수강생", value: `${totalAttendees}명` },
              { label: "평균 평점", value: `⭐ ${avgRating}` },
              { label: "활성 매칭", value: `${activeMatches.length}건` },
            ].map((s) => (
              <div key={s.label} className="py-3 text-center">
                <p className="text-white font-bold text-lg leading-tight">{s.value}</p>
                <p className="text-blue-300 text-xs">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 배정 수락 대기 배너 */}
        {pendingMatches.length > 0 && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔔</span>
              <div>
                <p className="font-bold text-amber-900">새 강의 배정 요청 {pendingMatches.length}건</p>
                <p className="text-xs text-amber-700 mt-0.5">수락 또는 거절을 선택해 주세요.</p>
              </div>
            </div>
            {pendingMatches.map((m) => (
              <div key={m.id} className="bg-white rounded-2xl p-4 shadow-sm border border-amber-100">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="font-semibold text-hwaseong-text">{m.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{m.client?.name}</p>
                  </div>
                  <StatusBadge status={m.status} />
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-3">
                  <span className="bg-gray-50 px-2 py-1 rounded-lg">🎯 {m.category}</span>
                  {m.address && <span className="bg-gray-50 px-2 py-1 rounded-lg">📍 {m.address}</span>}
                  <span className="bg-gray-50 px-2 py-1 rounded-lg">📅 {m.start_date}</span>
                  <span className="bg-gray-50 px-2 py-1 rounded-lg">👥 {m.participant_count}명{m.target_age ? ` (${m.target_age})` : ""}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => acceptMatch(m.id)}
                    disabled={actionInProgress === m.id}
                    className="flex-1 py-2.5 bg-hwaseong-blue text-white text-sm font-bold rounded-xl hover:bg-blue-900 transition-colors disabled:opacity-50"
                  >
                    {actionInProgress === m.id ? "처리 중..." : "✅ 수락"}
                  </button>
                  <button
                    onClick={() => rejectMatch(m.id)}
                    disabled={actionInProgress === m.id}
                    className="flex-1 py-2.5 bg-white border-2 border-red-300 text-red-500 text-sm font-bold rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {actionInProgress === m.id ? "처리 중..." : "✕ 거절"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 탭 */}
        <div className="flex gap-1 bg-gray-100 rounded-2xl p-1">
          {(["overview", "matches", "reports", "profile"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                tab === t ? "bg-white text-hwaseong-blue shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "overview" ? "현황" : t === "matches" ? "매칭 요청" : t === "reports" ? "활동 보고" : "프로필"}
            </button>
          ))}
        </div>

        {/* 현황 탭 */}
        {tab === "overview" && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "총 강의 횟수", value: reports.length, unit: "회", icon: "📚", color: "bg-hwaseong-blue" },
                { label: "누적 수강생", value: totalAttendees, unit: "명", icon: "👥", color: "bg-green-600" },
                { label: "평균 만족도", value: avgRating, unit: "점", icon: "🌟", color: "bg-amber-500" },
                { label: "활성 매칭", value: activeMatches.length, unit: "건", icon: "🔗", color: "bg-sky-500" },
              ].map((c) => (
                <div key={c.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className={`w-9 h-9 ${c.color} rounded-xl flex items-center justify-center text-base mb-2`}>{c.icon}</div>
                  <p className="text-2xl font-black text-hwaseong-text">{c.value}<span className="text-sm font-normal text-gray-400 ml-0.5">{c.unit}</span></p>
                  <p className="text-xs text-gray-400 mt-0.5">{c.label}</p>
                </div>
              ))}
            </div>

            {chartData.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-bold text-hwaseong-text mb-4">월별 강의 현황</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                    <Bar dataKey="count" name="강의 횟수" fill="#003087" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}

        {/* 매칭 요청 탭 */}
        {tab === "matches" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-hwaseong-text">배정된 매칭 요청</h3>
              <span className="text-xs text-gray-400">총 {matches.length}건</span>
            </div>
            {matches.length === 0 && (
              <div className="bg-white rounded-2xl p-8 text-center text-gray-400 border border-gray-100">
                <p className="text-4xl mb-3">📭</p>
                <p className="text-sm">아직 배정된 매칭 요청이 없습니다.</p>
              </div>
            )}
            {matches.map((m) => (
              <div key={m.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-semibold text-hwaseong-text">{m.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{m.client?.name} · {m.address}</p>
                  </div>
                  <StatusBadge status={m.status} />
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                  <span className="bg-gray-50 px-2 py-1 rounded-lg">🎯 {m.category}</span>
                  <span className="bg-gray-50 px-2 py-1 rounded-lg">👥 {m.participant_count}명{m.target_age ? ` (${m.target_age})` : ""}</span>
                  <span className="bg-gray-50 px-2 py-1 rounded-lg">📅 {m.start_date}</span>
                </div>
                {m.status === "matched" && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => acceptMatch(m.id)}
                      disabled={actionInProgress === m.id}
                      className="flex-1 py-2 bg-hwaseong-blue text-white text-xs font-bold rounded-xl hover:bg-blue-900 transition-colors disabled:opacity-50"
                    >
                      {actionInProgress === m.id ? "처리 중..." : "✅ 수락"}
                    </button>
                    <button
                      onClick={() => rejectMatch(m.id)}
                      disabled={actionInProgress === m.id}
                      className="flex-1 py-2 bg-white border-2 border-red-300 text-red-500 text-xs font-bold rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      {actionInProgress === m.id ? "처리 중..." : "✕ 거절"}
                    </button>
                  </div>
                )}
                {m.status === "ongoing" && (
                  <p className="text-xs text-green-600 bg-green-50 py-2 px-3 rounded-xl mt-3">✅ 진행 중 · 수요처 연락처가 공개되었습니다</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 활동 보고 탭 */}
        {tab === "reports" && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-hwaseong-text mb-4">활동 보고서 제출</h3>
              <form onSubmit={submitReport} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">매칭 선택</label>
                  <select
                    value={reportForm.matchId} onChange={(e) => setReportForm((p) => ({ ...p, matchId: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30 bg-white"
                    required
                  >
                    <option value="">-- 매칭 선택 --</option>
                    {eligibleMatches.map((m) => (
                      <option key={m.id} value={m.id}>{m.title} ({m.address})</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">강의 날짜</label>
                    <input
                      type="date" value={reportForm.lectureDate}
                      onChange={(e) => setReportForm((p) => ({ ...p, lectureDate: e.target.value }))}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">실제 참석자 수</label>
                    <input
                      type="number" min="1" value={reportForm.attendeeCount}
                      onChange={(e) => setReportForm((p) => ({ ...p, attendeeCount: e.target.value }))}
                      placeholder="0"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">강의 내용 (선택)</label>
                  <textarea
                    rows={3} value={reportForm.reportText}
                    onChange={(e) => setReportForm((p) => ({ ...p, reportText: e.target.value }))}
                    placeholder="강의 내용, 특이사항 등을 작성해 주세요."
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30 resize-none"
                  />
                </div>
                <button
                  type="submit" disabled={submittingReport}
                  className="w-full py-3 bg-hwaseong-blue text-white text-sm font-bold rounded-xl hover:bg-blue-900 transition-colors disabled:opacity-60"
                >
                  {submittingReport ? "제출 중..." : "보고서 제출"}
                </button>
              </form>
            </div>

            <h3 className="font-bold text-hwaseong-text">제출된 활동 보고서</h3>
            {reports.length === 0 && (
              <div className="bg-white rounded-2xl p-8 text-center text-gray-400 border border-gray-100">
                <p className="text-4xl mb-3">📄</p>
                <p className="text-sm">아직 제출된 보고서가 없습니다.</p>
              </div>
            )}
            {reports.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between mb-2">
                  <p className="font-semibold text-hwaseong-text text-sm">{r.match?.title}</p>
                  <span className="text-xs text-gray-400">{r.lecture_date}</span>
                </div>
                <p className="text-xs text-gray-500 mb-3">{r.match?.address} · 참석자 {r.attendance_count}명</p>
                {r.report_text && <p className="text-xs text-gray-600 leading-relaxed mb-3">{r.report_text}</p>}
                {r.rating_from_client !== null && (
                  <div className="flex items-center gap-2">
                    <Stars rating={r.rating_from_client} />
                    <span className="text-xs text-gray-500">수요처 평점</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 프로필 탭 */}
        {tab === "profile" && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
            <h3 className="font-bold text-hwaseong-text">프로필 수정</h3>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">자기소개</label>
              <textarea
                rows={3} value={profileForm.bio}
                onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))}
                placeholder="AI 강의 경험, 전문 분야 등을 소개해 주세요."
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">전문 분야 (쉼표 구분)</label>
              <input
                type="text" value={profileForm.specialties}
                onChange={(e) => setProfileForm((p) => ({ ...p, specialties: e.target.value }))}
                placeholder="생성형 AI, ChatGPT, AI 윤리"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">활동 가능 지역 (쉼표 구분)</label>
              <input
                type="text" value={profileForm.availableRegions}
                onChange={(e) => setProfileForm((p) => ({ ...p, availableRegions: e.target.value }))}
                placeholder="동탄, 봉담, 향남"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">연락처 (매칭 확정 후 공개)</label>
              <input
                type="tel" value={profileForm.phone}
                onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="010-0000-0000"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30"
              />
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
              🔒 연락처는 매칭이 확정된 이후에만 수요처에게 공개됩니다. (안심매칭)
            </div>
            <button
              onClick={saveProfile} disabled={saving}
              className="w-full py-3 bg-hwaseong-blue text-white text-sm font-bold rounded-xl hover:bg-blue-900 transition-colors disabled:opacity-60"
            >
              {saving ? "저장 중..." : "저장하기"}
            </button>
          </div>
        )}

      </DashboardLayout>
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:   { label: "대기 중",  cls: "bg-amber-100 text-amber-700" },
    matched:   { label: "매칭됨",   cls: "bg-blue-100 text-blue-700" },
    ongoing:   { label: "진행 중",  cls: "bg-green-100 text-green-700" },
    completed: { label: "완료",     cls: "bg-gray-100 text-gray-600" },
    cancelled: { label: "취소",     cls: "bg-red-50 text-red-500" },
    rejected:  { label: "거절됨",   cls: "bg-orange-100 text-orange-700" },
  };
  const s = map[status] ?? { label: status, cls: "bg-gray-100 text-gray-500" };
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${s.cls}`}>{s.label}</span>;
}
