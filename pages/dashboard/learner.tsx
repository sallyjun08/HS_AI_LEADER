import Head from "next/head";
import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import SkillTree from "@/components/SkillTree";
import { MOCK_COURSES } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth-context";
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

type TabKey = "all" | 1 | 2;

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "전체" },
  { key: 1,     label: "STEP 1 · 기초 소양" },
  { key: 2,     label: "STEP 2 · 시민 리더 양성" },
];

const DISTRICTS = [
  "향남읍", "남양읍", "우정읍", "장안면", "양감면", "정남면", "마도면",
  "송산면", "서신면", "팔탄면", "매송면", "비봉면", "동탄1동", "동탄2동",
  "동탄3동", "동탄4동", "동탄5동", "동탄6동", "동탄7동", "동탄8동",
  "병점1동", "병점2동", "진안동", "반월동", "기배동", "화산동",
  "능동", "기타",
];

const EMPTY_FORM = {
  name: "", phone: "", district: "", job: "",
  motivation: "", step: "1" as "1" | "2", hasExperience: false, agreed: false,
};

export default function LearnerDashboard() {
  const { profile } = useAuth();
  const displayName = profile?.name ?? "시민";

  const [tab, setTab]            = useState<TabKey>("all");
  const [appliedIds, setApplied] = useState<Set<string>>(new Set());
  const [modal, setModal]        = useState<Course | null>(null);
  const [showApply, setShowApply] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm]          = useState(EMPTY_FORM);

  const courses = (tab === "all"
    ? MOCK_COURSES
    : MOCK_COURSES.filter((c) => c.stage === tab)
  ).filter((c) => c.stage !== 3);

  function handleFormChange(key: keyof typeof EMPTY_FORM, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit() {
    if (!form.name || !form.phone || !form.district || !form.motivation || !form.agreed) return;
    setSubmitted(true);
  }

  return (
    <>
      <Head>
        <title>예비 시민 리더 대시보드 | 화성 AI 리더 허브</title>
      </Head>

      <DashboardLayout pageTitle="예비 시민 리더 대시보드">

        {/* ── 개인화 환영 배너 ── */}
        <div className="bg-gradient-to-r from-hwaseong-blue to-hwaseong-skyblue rounded-2xl p-6 text-white">
          <p className="text-blue-200 text-sm mb-1">환영합니다</p>
          <h2 className="text-xl font-bold mb-1">
            {displayName}님, 화성의 AI 미래를 함께 이끌 준비가 되셨나요?
          </h2>
          <p className="text-blue-100 text-sm">
            현재 <strong className="text-white">47명</strong>의 AI 시민 리더가 활동 중이며, 누적 <strong className="text-white">156회</strong>의 강의가 진행됐습니다.
          </p>
          <button
            onClick={() => { setShowApply(true); setSubmitted(false); setForm(EMPTY_FORM); }}
            className="mt-4 bg-white text-hwaseong-blue font-bold text-sm px-6 py-2.5 rounded-xl hover:bg-blue-50 transition-colors shadow"
          >
            AI 시민 리더 양성 과정 신청하기 →
          </button>
        </div>

        {/* ── 요약 카드 ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "이수 과정",   value: "2개", icon: "✅", color: "bg-green-500" },
            { label: "신청 과정",   value: `${appliedIds.size}개`, icon: "📋", color: "bg-hwaseong-blue" },
            { label: "취득 수료증", value: "2장", icon: "🏅", color: "bg-amber-500" },
            { label: "현재 진행",   value: "1개", icon: "▶",  color: "bg-sky-500" },
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
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-bold text-hwaseong-text text-lg">나의 학습 로드맵</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                AI 기초 소양 → 시민 리더 양성 → AI 시민 리더 자격 취득
              </p>
            </div>
            <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
              2/6 이수
            </span>
          </div>
          <SkillTree completedSteps={[1, 2]} />
        </section>

        {/* ── 교육 과정 신청 ── */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-bold text-hwaseong-text text-lg">교육 과정 신청</h2>
              <p className="text-xs text-gray-400 mt-0.5">STEP 1·2 과정 — AI 시민 리더 양성 과정</p>
            </div>
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
                      <div className="flex gap-2 text-hwaseong-blue font-medium"><span>🏅</span><span>{c.cert}</span></div>
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
                      {isApplied ? "신청 완료" : canApply ? "수강 신청" : STATUS_LABEL[c.status]}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </DashboardLayout>

      {/* ── 수강 신청 확인 모달 ── */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-4">
              <span className="text-4xl block mb-2">🎓</span>
              <h3 className="font-bold text-hwaseong-text text-lg">수강 신청 확인</h3>
            </div>
            <div className="bg-[#eef3f9] rounded-xl p-4 mb-4 text-sm space-y-1.5">
              <p className="font-semibold text-hwaseong-text">{modal.title}</p>
              <p className="text-gray-500">일정: {modal.schedule}</p>
              <p className="text-gray-500">장소: {modal.location}</p>
              <p className="text-xs text-hwaseong-blue font-medium">🏅 {modal.cert}</p>
            </div>
            <p className="text-xs text-gray-400 text-center mb-4">최종 확정은 담당자 확인 후 완료됩니다.</p>
            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                취소
              </button>
              <button
                onClick={() => { setApplied((p) => new Set([...p, modal.id])); setModal(null); }}
                className="flex-1 py-2.5 bg-hwaseong-blue text-white rounded-xl text-sm font-semibold hover:bg-blue-900"
              >
                신청하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 양성 과정 신청 모달 ── */}
      {showApply && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowApply(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>

            {submitted ? (
              <div className="p-8 text-center">
                <span className="text-5xl block mb-4">🎉</span>
                <h3 className="font-bold text-hwaseong-text text-xl mb-2">신청이 접수됐습니다!</h3>
                <p className="text-gray-500 text-sm mb-1">화성특례시 AI랩 담당자가 검토 후</p>
                <p className="text-gray-500 text-sm mb-6">입력하신 연락처로 안내드립니다.</p>
                <button onClick={() => setShowApply(false)} className="bg-hwaseong-blue text-white px-8 py-3 rounded-xl font-semibold text-sm hover:bg-blue-900">
                  확인
                </button>
              </div>
            ) : (
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-bold text-hwaseong-text text-lg">AI 시민 리더 양성 과정 신청</h3>
                    <p className="text-xs text-gray-400 mt-0.5">화성특례시 AI랩 공식 접수</p>
                  </div>
                  <button onClick={() => setShowApply(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
                </div>

                <div className="space-y-4">
                  {/* 희망 단계 */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-2">희망 참여 단계 *</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { val: "1", title: "STEP 1", desc: "AI 기초 소양 과정" },
                        { val: "2", title: "STEP 2", desc: "AI 시민 리더 양성 (STEP 1 이수 후)" },
                      ].map((s) => (
                        <button
                          key={s.val}
                          type="button"
                          onClick={() => handleFormChange("step", s.val as "1" | "2")}
                          className={`p-3 rounded-xl border-2 text-left transition-all ${
                            form.step === s.val
                              ? "border-hwaseong-blue bg-hwaseong-light"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <p className={`text-xs font-bold ${form.step === s.val ? "text-hwaseong-blue" : "text-gray-700"}`}>{s.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 성명 / 연락처 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">성명 *</label>
                      <input
                        value={form.name}
                        onChange={(e) => handleFormChange("name", e.target.value)}
                        placeholder="홍길동"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-hwaseong-blue"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">연락처 *</label>
                      <input
                        value={form.phone}
                        onChange={(e) => handleFormChange("phone", e.target.value)}
                        placeholder="010-0000-0000"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-hwaseong-blue"
                      />
                    </div>
                  </div>

                  {/* 거주지 */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">거주 지역 (화성시 내) *</label>
                    <select
                      value={form.district}
                      onChange={(e) => handleFormChange("district", e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-hwaseong-blue text-gray-700"
                    >
                      <option value="">읍/면/동 선택</option>
                      {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>

                  {/* 직업/소속 */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">직업 / 소속</label>
                    <input
                      value={form.job}
                      onChange={(e) => handleFormChange("job", e.target.value)}
                      placeholder="예: 직장인, 주부, 대학생, 화성시청 등"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-hwaseong-blue"
                    />
                  </div>

                  {/* 지원 동기 */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">지원 동기 *</label>
                    <textarea
                      value={form.motivation}
                      onChange={(e) => handleFormChange("motivation", e.target.value)}
                      placeholder="AI 교육에 관심을 갖게 된 계기, 참여 목적 등을 자유롭게 작성해주세요."
                      rows={3}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-hwaseong-blue resize-none"
                    />
                  </div>

                  {/* AI 사전 경험 */}
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-2">AI 관련 사전 학습 경험이 있으신가요?</label>
                    <div className="flex gap-3">
                      {[{ val: true, label: "있음" }, { val: false, label: "없음" }].map((o) => (
                        <button
                          key={String(o.val)}
                          type="button"
                          onClick={() => handleFormChange("hasExperience", o.val)}
                          className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                            form.hasExperience === o.val
                              ? "border-hwaseong-blue bg-hwaseong-light text-hwaseong-blue"
                              : "border-gray-200 text-gray-600 hover:border-gray-300"
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 동의 */}
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.agreed}
                      onChange={(e) => handleFormChange("agreed", e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-hwaseong-blue flex-shrink-0"
                    />
                    <span className="text-xs text-gray-500 leading-relaxed">
                      수집된 개인정보는 AI 시민 리더 양성 과정 운영 목적으로만 사용되며, 화성특례시 개인정보 처리방침에 따라 보호됩니다. <strong className="text-gray-700">개인정보 수집 및 이용에 동의합니다. *</strong>
                    </span>
                  </label>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!form.name || !form.phone || !form.district || !form.motivation || !form.agreed}
                  className="mt-6 w-full py-3.5 bg-hwaseong-blue text-white font-bold text-sm rounded-xl hover:bg-blue-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                >
                  신청서 제출하기
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
