import Head from "next/head";
import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import DashboardLayout from "@/components/DashboardLayout";
import { MOCK_MATCH_REQUESTS, MONTHLY_STATS, CATEGORY_STATS, MOCK_COURSES } from "@/lib/mock-data";
import type { MatchRequest } from "@/types/database";

const PIE_COLORS = ["#003087", "#0066CC", "#2E7D32", "#F59E0B"];

const MATCH_STATUS_STYLE: Record<MatchRequest["status"], string> = {
  pending:   "bg-amber-100 text-amber-700",
  matched:   "bg-blue-100  text-blue-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-200  text-gray-500",
};
const MATCH_STATUS_LABEL: Record<MatchRequest["status"], string> = {
  pending: "대기 중", matched: "매칭 완료", completed: "강의 완료", cancelled: "취소",
};

const INSTRUCTORS = [
  { id: "i1", name: "박준호", expertise: "생성형 AI·업무 자동화",  sessions: 12, rating: 4.9 },
  { id: "i2", name: "이서연", expertise: "AI 윤리·공공행정",        sessions: 8,  rating: 4.8 },
  { id: "i3", name: "김민준", expertise: "AI 기초·디지털 리터러시", sessions: 15, rating: 4.7 },
  { id: "i4", name: "최유진", expertise: "창업·생성형 AI",           sessions: 6,  rating: 4.6 },
];

type MatchTab = "pending" | "all";

export default function OperatorDashboard() {
  const [matchTab, setMatchTab]     = useState<MatchTab>("pending");
  const [selectedReq, setSelectedReq] = useState<MatchRequest | null>(null);
  const [assignedInst, setAssignedInst] = useState<string>("");
  const [venue, setVenue]           = useState("");
  const [requests, setRequests]     = useState(MOCK_MATCH_REQUESTS);

  const displayed = matchTab === "pending"
    ? requests.filter((r) => r.status === "pending")
    : requests;

  function doMatch() {
    if (!selectedReq || !assignedInst) return;
    const inst = INSTRUCTORS.find((i) => i.id === assignedInst);
    setRequests((prev) =>
      prev.map((r) =>
        r.id === selectedReq.id
          ? { ...r, status: "matched" as const, instructor_name: inst?.name }
          : r
      )
    );
    setSelectedReq(null);
    setAssignedInst("");
    setVenue("");
  }

  const pendingCount   = requests.filter((r) => r.status === "pending").length;
  const matchedCount   = requests.filter((r) => r.status === "matched").length;
  const completedCount = requests.filter((r) => r.status === "completed").length;
  const totalLearners  = MONTHLY_STATS.reduce((s, m) => s + m.learners, 0);

  return (
    <>
      <Head>
        <title>운영자 대시보드 | 화성 AI 리더 허브</title>
      </Head>

      <DashboardLayout pageTitle="운영자 관제 대시보드">

        {/* ── KPI 카드 ── */}
        <div id="kpi" className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "매칭 대기",   value: pendingCount,   icon: "⏳", color: "bg-amber-500",     sub: "처리 필요" },
            { label: "매칭 완료",   value: matchedCount,   icon: "🔗", color: "bg-hwaseong-blue", sub: "강의 예정" },
            { label: "강의 완료",   value: completedCount, icon: "✅", color: "bg-green-600",     sub: "이번 분기" },
            { label: "누적 수강생", value: totalLearners,  icon: "👥", color: "bg-sky-500",       sub: "2026 상반기" },
          ].map((c) => (
            <div key={c.label} className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-gray-100">
              <div className={`w-10 h-10 ${c.color} rounded-xl flex items-center justify-center text-lg flex-shrink-0`}>
                {c.icon}
              </div>
              <div>
                <p className="text-xs text-gray-400">{c.label}</p>
                <p className="text-2xl font-bold text-hwaseong-text">{c.value}</p>
                <p className="text-xs text-gray-400">{c.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── 차트 row ── */}
        <div id="stats" className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-bold text-hwaseong-text mb-1">월별 교육 현황</h3>
            <p className="text-xs text-gray-400 mb-4">전체 강의 세션 및 수강생 수 추이</p>
            <ResponsiveContainer width="100%" height={210}>
              <LineChart data={MONTHLY_STATS} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left"  tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line yAxisId="left"  type="monotone" dataKey="sessions" stroke="#003087" strokeWidth={2.5} dot={{ r: 4 }} name="강의 횟수" />
                <Line yAxisId="right" type="monotone" dataKey="learners" stroke="#0066CC" strokeWidth={2.5} dot={{ r: 4 }} name="수강생 수" strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-bold text-hwaseong-text mb-1">수요 카테고리</h3>
            <p className="text-xs text-gray-400 mb-4">파견 요청 주제 분포</p>
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie
                  data={CATEGORY_STATS}
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={80}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {CATEGORY_STATS.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── 매칭 관제 ── */}
        <section id="matching" className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-hwaseong-text text-lg">강사-수요처 매칭 관제</h3>
              <p className="text-sm text-gray-500 mt-0.5">파견 요청을 검토하고 적합한 강사를 배정하세요</p>
            </div>
            <div className="flex gap-2">
              {(["pending", "all"] as MatchTab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setMatchTab(t)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                    matchTab === t
                      ? "bg-hwaseong-blue text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {t === "pending" ? `대기 중 (${pendingCount})` : "전체 요청"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {displayed.map((req) => (
              <div
                key={req.id}
                className={`border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 transition-all ${
                  req.status === "pending"
                    ? "border-amber-200 bg-amber-50"
                    : "border-gray-100 bg-white"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${MATCH_STATUS_STYLE[req.status]}`}>
                      {MATCH_STATUS_LABEL[req.status]}
                    </span>
                    <span className="font-semibold text-hwaseong-text text-sm">{req.theme}</span>
                  </div>
                  <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-0.5">
                    <span>🏢 {req.requester_org}</span>
                    <span>👤 {req.requester_name}</span>
                    <span>📅 {req.preferred_date}</span>
                    <span>👥 {req.audience_size}명</span>
                    <span>📍 {req.location}</span>
                  </div>
                  {req.instructor_name && (
                    <p className="text-xs text-hwaseong-blue font-medium mt-1">
                      🔗 배정 강사: {req.instructor_name}
                    </p>
                  )}
                </div>
                {req.status === "pending" && (
                  <button
                    onClick={() => setSelectedReq(req)}
                    className="flex-shrink-0 bg-hwaseong-blue text-white text-xs px-4 py-2 rounded-lg font-semibold hover:bg-blue-900 transition-colors"
                  >
                    강사 배정 →
                  </button>
                )}
              </div>
            ))}
            {displayed.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-6">대기 중인 요청이 없습니다.</p>
            )}
          </div>
        </section>

        {/* ── 강사 현황 ── */}
        <section id="instructors" className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-bold text-hwaseong-text mb-4">등록 강사 현황</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {["강사명", "전문 분야", "강의 횟수", "평점", "상태"].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 pb-2 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {INSTRUCTORS.map((inst) => (
                  <tr key={inst.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2.5 pr-4 font-semibold text-hwaseong-text">{inst.name}</td>
                    <td className="py-2.5 pr-4 text-gray-500 text-xs">{inst.expertise}</td>
                    <td className="py-2.5 pr-4 font-medium">{inst.sessions}회</td>
                    <td className="py-2.5 pr-4">
                      <span className="text-amber-400">★</span>
                      <span className="font-medium ml-1">{inst.rating}</span>
                    </td>
                    <td className="py-2.5">
                      <span className="text-xs bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full">활동 중</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── 과정별 신청 현황 ── */}
        <section id="courses" className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-hwaseong-text">과정별 신청 현황</h3>
            <button className="text-xs text-hwaseong-skyblue hover:underline">엑셀 다운로드</button>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={MOCK_COURSES.map((c) => ({
                name: c.title.slice(0, 10) + "…",
                enrolled: c.enrolled,
                capacity: c.capacity,
              }))}
              margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="capacity" name="정원"  fill="#E8F0FB" radius={[4, 4, 0, 0]} />
              <Bar dataKey="enrolled" name="신청"  fill="#003087" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>

      </DashboardLayout>

      {/* ── 강사 배정 모달 ── */}
      {selectedReq && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedReq(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-hwaseong-text text-lg mb-1">강사 배정</h3>
            <p className="text-sm text-gray-500 mb-4">
              적합한 강사를 선택하고 교육 장소를 지정하세요.
            </p>

            <div className="bg-hwaseong-gray rounded-xl p-3 mb-4 text-xs text-gray-600 space-y-1">
              <p className="font-semibold text-hwaseong-text">{selectedReq.theme}</p>
              <p>기관: {selectedReq.requester_org} · {selectedReq.preferred_date} · {selectedReq.audience_size}명</p>
            </div>

            <div className="mb-4">
              <label className="text-xs font-semibold text-gray-600 block mb-2">강사 선택</label>
              <div className="space-y-2">
                {INSTRUCTORS.map((inst) => (
                  <label
                    key={inst.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      assignedInst === inst.id
                        ? "border-hwaseong-blue bg-blue-50"
                        : "border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="instructor"
                      value={inst.id}
                      checked={assignedInst === inst.id}
                      onChange={() => setAssignedInst(inst.id)}
                      className="accent-hwaseong-blue"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-hwaseong-text text-sm">{inst.name}</p>
                      <p className="text-xs text-gray-400">
                        {inst.expertise} · ★{inst.rating} · {inst.sessions}회
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className="text-xs font-semibold text-gray-600 block mb-1">교육 장소 배정</label>
              <input
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="예: AI 혁신센터 본원 4F 세미나실"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-hwaseong-blue"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedReq(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={doMatch}
                disabled={!assignedInst}
                className="flex-1 py-2.5 bg-hwaseong-blue text-white rounded-xl text-sm font-semibold hover:bg-blue-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                매칭 확정
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
