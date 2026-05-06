import Head from "next/head";
import { useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";
import SkillTree from "@/components/SkillTree";
import { MOCK_COURSES } from "@/lib/mock-data";
import type { Course } from "@/types/database";

const STATUS_LABEL: Record<Course["status"], string> = {
  recruiting: "모집중", ongoing: "진행중", closed: "마감", upcoming: "예정",
};
const STATUS_STYLE: Record<Course["status"], string> = {
  recruiting: "bg-green-100 text-green-800",
  ongoing:    "bg-blue-100  text-blue-800",
  closed:     "bg-gray-200  text-gray-500",
  upcoming:   "bg-amber-100 text-amber-700",
};
const STAGE_LABEL: Record<1 | 2 | 3, string> = { 1: "STEP 1", 2: "STEP 2", 3: "STEP 3" };
const STAGE_STYLE: Record<1 | 2 | 3, string> = {
  1: "bg-sky-50 text-sky-700",
  2: "bg-indigo-50 text-indigo-700",
  3: "bg-green-50 text-green-700",
};

type TabKey = "all" | 1 | 2 | 3;

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "전체" },
  { key: 1,     label: "STEP 1 · 기초 소양" },
  { key: 2,     label: "STEP 2 · 시민 리더" },
  { key: 3,     label: "STEP 3 · 기업 맞춤형" },
];

export default function LearnerDashboard() {
  const [tab, setTab]             = useState<TabKey>("all");
  const [appliedIds, setApplied]  = useState<Set<string>>(new Set());
  const [modal, setModal]         = useState<Course | null>(null);
  const [showRequest, setShowReq] = useState(false);
  const [form, setForm] = useState({ org: "", theme: "", date: "", size: "", location: "" });

  const courses = tab === "all" ? MOCK_COURSES : MOCK_COURSES.filter((c) => c.stage === tab);

  return (
    <>
      <Head>
        <title>학습자 대시보드 | 화성 AI 리더 허브</title>
      </Head>

      <DashboardLayout role="learner" userName="홍길동" pageTitle="학습자 대시보드">

        {/* ── 학습 대시보드 배너 ── */}
        <Link href="/dashboard/learning">
          <div className="bg-gradient-to-r from-hwaseong-blue to-hwaseong-skyblue rounded-2xl p-5 flex items-center gap-4 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all">
            <div className="text-4xl">🗺️</div>
            <div className="flex-1">
              <p className="text-white font-bold text-base">학습 대시보드 — 로드맵 & 디지털 배지</p>
              <p className="text-blue-200 text-xs mt-0.5">현재 2단계 수강 중 · 학습 진도 55% · 배지 1개 취득</p>
            </div>
            <div className="bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0">
              바로가기 →
            </div>
          </div>
        </Link>

        {/* ── 요약 카드 ── */}
        <div id="summary" className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "이수 과정",   value: "2개",                  icon: "✅", color: "bg-green-500" },
            { label: "신청 과정",   value: `${appliedIds.size}개`, icon: "📋", color: "bg-hwaseong-blue" },
            { label: "취득 수료증", value: "2장",                  icon: "🏅", color: "bg-amber-500" },
            { label: "현재 진행",   value: "1개",                  icon: "▶",  color: "bg-sky-500" },
          ].map((c) => (
            <div key={c.label} className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-gray-100">
              <div className={`w-10 h-10 ${c.color} rounded-xl flex items-center justify-center text-lg flex-shrink-0`}>
                {c.icon}
              </div>
              <div>
                <p className="text-xs text-gray-400">{c.label}</p>
                <p className="text-xl font-bold text-hwaseong-text">{c.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── 학습 로드맵 ── */}
        <section id="roadmap" className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-bold text-hwaseong-text text-lg">나의 학습 로드맵</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                AI 기초 소양 → 시민 리더 → 강사 활동으로 이어지는 성장 경로
              </p>
            </div>
            <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
              2/6 이수
            </span>
          </div>
          <SkillTree completedSteps={[1, 2]} />
        </section>

        {/* ── 교육 과정 신청 ── */}
        <section id="courses">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="font-bold text-hwaseong-text text-lg">교육 과정 신청</h2>
            <div className="flex flex-wrap gap-2">
              {TABS.map((t) => (
                <button
                  key={String(t.key)}
                  onClick={() => setTab(t.key)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                    tab === t.key
                      ? "bg-hwaseong-blue text-white"
                      : "bg-white text-gray-600 border border-gray-200 hover:border-hwaseong-blue"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {courses.map((c) => {
              const isApplied = appliedIds.has(c.id);
              const canApply  = c.status === "recruiting" && !isApplied;
              const pct       = Math.round((c.enrolled / c.capacity) * 100);

              return (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col hover:shadow-md transition-all hover:-translate-y-0.5"
                >
                  <div className="p-5 flex-1">
                    <div className="flex gap-2 mb-3 flex-wrap">
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${STATUS_STYLE[c.status]}`}>
                        {STATUS_LABEL[c.status]}
                      </span>
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${STAGE_STYLE[c.stage]}`}>
                        {STAGE_LABEL[c.stage]}
                      </span>
                      {isApplied && (
                        <span className="text-xs text-hwaseong-skyblue font-semibold">✓ 신청완료</span>
                      )}
                    </div>
                    <h3 className="font-bold text-hwaseong-text text-sm leading-snug mb-1">{c.title}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-2">{c.description}</p>
                    <div className="space-y-1 text-xs text-gray-500">
                      <div className="flex gap-2"><span>📅</span><span>{c.schedule}</span></div>
                      <div className="flex gap-2"><span>📍</span><span>{c.location}</span></div>
                      <div className="flex gap-2 text-hwaseong-blue font-medium">
                        <span>🏅</span><span>{c.cert}</span>
                      </div>
                    </div>
                  </div>
                  <div className="px-5 pb-4">
                    <div className="mb-2.5">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>신청 현황</span>
                        <span>{c.enrolled}/{c.capacity}명</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pct >= 80 ? "bg-red-400" : "bg-hwaseong-skyblue"}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => canApply && setModal(c)}
                      disabled={!canApply}
                      className={`w-full py-2 rounded-xl text-sm font-semibold transition-all ${
                        isApplied
                          ? "bg-hwaseong-light text-hwaseong-skyblue cursor-default"
                          : canApply
                          ? "bg-hwaseong-blue text-white hover:bg-blue-900 active:scale-95"
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      {isApplied ? "신청 완료" : canApply ? "원클릭 수강 신청" : STATUS_LABEL[c.status]}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── 강사 파견 요청 ── */}
        <section
          id="dispatch"
          className="bg-hwaseong-light border border-blue-100 rounded-2xl p-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-hwaseong-text text-lg">강사 파견 요청</h2>
              <p className="text-sm text-gray-500 mt-1">
                학교·기업·기관에서 AI 강사를 초청하고 싶으시면 요청해 주세요.
                운영자가 적합한 강사를 매칭합니다.
              </p>
            </div>
            <button
              onClick={() => setShowReq(true)}
              className="flex-shrink-0 bg-hwaseong-blue text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-900 transition-colors shadow-md"
            >
              + 파견 요청하기
            </button>
          </div>
        </section>

      </DashboardLayout>

      {/* ── 수강 신청 모달 ── */}
      {modal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <span className="text-4xl block mb-2">🎓</span>
              <h3 className="font-bold text-hwaseong-text text-lg">수강 신청 확인</h3>
            </div>
            <div className="bg-hwaseong-gray rounded-xl p-4 mb-4 text-sm space-y-1.5">
              <p className="font-semibold text-hwaseong-text">{modal.title}</p>
              <p className="text-gray-500">일정: {modal.schedule}</p>
              <p className="text-gray-500">장소: {modal.location}</p>
              <p className="text-xs text-hwaseong-blue font-medium">🏅 {modal.cert}</p>
            </div>
            <p className="text-xs text-gray-400 text-center mb-4">
              최종 확정은 담당자 확인 후 완료됩니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={() => {
                  setApplied((p) => new Set([...p, modal.id]));
                  setModal(null);
                }}
                className="flex-1 py-2.5 bg-hwaseong-blue text-white rounded-xl text-sm font-semibold hover:bg-blue-900"
              >
                신청하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 파견 요청 모달 ── */}
      {showRequest && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowReq(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-hwaseong-text text-lg mb-4">강사 파견 요청</h3>
            <div className="space-y-3">
              {[
                { key: "org",      label: "기관명",    placeholder: "예: 동탄초등학교" },
                { key: "theme",    label: "강의 테마",  placeholder: "예: 어린이 AI 기초 교육" },
                { key: "date",     label: "희망 일정",  placeholder: "예: 2026-06-14" },
                { key: "size",     label: "예상 인원",  placeholder: "예: 25" },
                { key: "location", label: "교육 장소",  placeholder: "예: 학교 교실" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">{f.label}</label>
                  <input
                    value={form[f.key as keyof typeof form]}
                    onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-hwaseong-blue"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowReq(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={() => setShowReq(false)}
                className="flex-1 py-2.5 bg-hwaseong-blue text-white rounded-xl text-sm font-semibold hover:bg-blue-900"
              >
                요청 제출
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
