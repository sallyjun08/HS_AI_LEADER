import Head from "next/head";
import { useState } from "react";
import Link from "next/link";
import DashboardLayout from "@/components/DashboardLayout";

/* ─── 타입 ────────────────────────────────────────────────── */
type StepStatus = "completed" | "active" | "locked";

interface StepData {
  id: number;
  label: string;
  title: string;
  subtitle: string;
  status: StepStatus;
  desc: string;
  cert: string;
  courses: string[];
  completedDate?: string;
  progress?: number;
  currentSession?: string;
  nextDate?: string;
  unlockCondition?: string;
}

interface BadgeData {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  unlocked: boolean;
  completedDate?: string;
  desc: string;
  issuer: string;
  gradient: string;
  glowClass: string;
  criteria: string;
}

/* ─── 학습 단계 데이터 ────────────────────────────────────── */
const STEPS: StepData[] = [
  {
    id: 1,
    label: "STEP 1",
    title: "기본 소양",
    subtitle: "AI 기초 이해",
    status: "completed",
    desc: "생성형 AI 기초, AI 윤리, 디지털 시민권 등 핵심 소양을 습득합니다.",
    courses: ["생성형 AI 기초와 ChatGPT 실습", "AI 트렌드와 디지털 시민권"],
    cert: "화성특례시장 수료증",
    completedDate: "2026.03.15",
  },
  {
    id: 2,
    label: "STEP 2",
    title: "심화 양성",
    subtitle: "AI 시민 리더 양성",
    status: "active",
    desc: "강사 역량을 갖춘 AI 시민 리더로 성장하는 8주 심화 과정입니다.",
    courses: ["AI 시민 리더 양성 과정 (심화) — 1기"],
    cert: "KAIST 총장 명의 이수증 + AI 시민 리더 자격",
    progress: 65,
    currentSession: "5/8 회차",
    nextDate: "2026.05.24 (토) 10:00",
  },
  {
    id: 3,
    label: "인증 평가",
    title: "인증 평가",
    subtitle: "AI 리더 공식 인증",
    status: "locked",
    desc: "역량 평가를 통과하면 AI 시민 리더 공식 자격과 디지털 배지가 발급됩니다.",
    courses: [],
    cert: "AI 시민 리더 디지털 배지",
    unlockCondition: "2단계 심화 양성 과정 수료 후 응시 가능",
  },
];

/* ─── 배지 데이터 ─────────────────────────────────────────── */
const BADGES: BadgeData[] = [
  {
    id: "step1",
    title: "AI 기초 소양",
    subtitle: "AI Basic Literacy",
    emoji: "🎓",
    unlocked: true,
    completedDate: "2026.03.15",
    desc: "AI 기초 소양 과정을 수료한 학습자에게 발급되는 화성특례시 공식 디지털 배지입니다.",
    issuer: "화성특례시장",
    gradient: "from-sky-400 via-blue-500 to-indigo-500",
    glowClass: "badge-glow-blue",
    criteria: "STEP 1 기본 소양 과정 수료",
  },
  {
    id: "leader",
    title: "AI 시민 리더",
    subtitle: "Hwaseong AI Citizen Leader",
    emoji: "🏅",
    unlocked: false,
    desc: "인증 평가를 통과한 AI 시민 리더에게 발급되는 화성특례시 최고 등급 디지털 배지입니다.",
    issuer: "화성특례시장",
    gradient: "from-yellow-400 via-amber-400 to-orange-400",
    glowClass: "badge-glow-gold",
    criteria: "STEP 2 수료 + 인증 평가 통과",
  },
];

/* ─── 스테퍼 아이콘 ─────────────────────────────────────────*/
function StepIcon({ status, id }: { status: StepStatus; id: number }) {
  if (status === "completed") {
    return (
      <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center text-white shadow-md flex-shrink-0">
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }
  if (status === "active") {
    return (
      <div className="w-14 h-14 rounded-full bg-hwaseong-blue flex items-center justify-center text-white shadow-lg step-pulse flex-shrink-0">
        <span className="font-bold text-sm">{id}</span>
      </div>
    );
  }
  return (
    <div className="w-14 h-14 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center flex-shrink-0">
      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    </div>
  );
}

/* ─── 배지 카드 ─────────────────────────────────────────────*/
interface BadgeCardProps {
  badge: BadgeData;
  onShare: (b: BadgeData) => void;
  onSave: (b: BadgeData) => void;
}

function BadgeCard({ badge, onShare, onSave }: BadgeCardProps) {
  return (
    <div className={`relative bg-white rounded-3xl border-2 p-6 flex flex-col items-center text-center transition-all ${
      badge.unlocked
        ? "border-gray-100 shadow-xl"
        : "border-gray-100 shadow-sm opacity-80"
    }`}>
      {/* Locked overlay */}
      {!badge.unlocked && (
        <div className="absolute inset-0 bg-white/70 rounded-3xl backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-3">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-600">인증 평가 통과 후 활성화</p>
            <p className="text-xs text-gray-400 mt-1">{badge.criteria}</p>
          </div>
        </div>
      )}

      {/* Badge emblem */}
      <div className="relative mb-5">
        {/* Sparkles (unlocked only) */}
        {badge.unlocked && (
          <div className="absolute inset-0 -m-6 pointer-events-none">
            {[
              { cls: "sp-1", pos: "top-0 left-2",    size: "w-3 h-3" },
              { cls: "sp-2", pos: "top-2 right-0",   size: "w-2.5 h-2.5" },
              { cls: "sp-3", pos: "bottom-2 left-0", size: "w-2 h-2" },
              { cls: "sp-4", pos: "bottom-0 right-2",size: "w-3.5 h-3.5" },
              { cls: "sp-5", pos: "top-1/2 -left-2", size: "w-2 h-2" },
            ].map((s) => (
              <span key={s.cls} className={`absolute ${s.pos} ${s.size} ${s.cls} text-yellow-400`}>✦</span>
            ))}
          </div>
        )}

        {/* Badge circle */}
        <div
          className={`relative w-36 h-36 rounded-full bg-gradient-to-br ${badge.gradient} flex flex-col items-center justify-center overflow-hidden ${
            badge.unlocked ? `${badge.glowClass} badge-float` : "filter grayscale"
          }`}
        >
          {/* Shine sweep */}
          {badge.unlocked && (
            <div className="badge-shine-anim absolute inset-0 w-1/3 h-[200%] -top-[50%] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
          )}

          {/* Inner content */}
          <div className="relative z-10 flex flex-col items-center">
            <span className="text-4xl mb-1">{badge.emoji}</span>
            <div className="text-white text-center px-2">
              <p className="font-bold text-xs leading-tight">화성특례시</p>
              <p className="font-black text-[10px] leading-tight">AI 리더 허브</p>
            </div>
          </div>

          {/* Outer ring */}
          <div className="absolute inset-2 rounded-full border-2 border-white/40 pointer-events-none" />
        </div>

        {/* Verified checkmark */}
        {badge.unlocked && (
          <div className="absolute -bottom-1 -right-1 w-9 h-9 bg-green-500 rounded-full flex items-center justify-center border-2 border-white shadow">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>

      {/* Badge info */}
      <h3 className="font-bold text-hwaseong-text text-lg mb-0.5">{badge.title}</h3>
      <p className="text-xs text-gray-400 font-medium mb-3">{badge.subtitle}</p>

      {badge.unlocked && badge.completedDate && (
        <p className="text-xs text-green-600 font-semibold bg-green-50 px-3 py-1 rounded-full mb-2">
          ✓ 취득일 {badge.completedDate}
        </p>
      )}

      <p className="text-xs text-gray-500 leading-relaxed mb-1">{badge.desc}</p>
      <p className="text-xs text-gray-400 mb-5">발급: {badge.issuer}</p>

      {/* Divider */}
      <div className="w-full border-t border-gray-100 pt-4 space-y-2 w-full">
        <button
          onClick={() => badge.unlocked && onShare(badge)}
          disabled={!badge.unlocked}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            badge.unlocked
              ? "bg-hwaseong-blue text-white hover:bg-blue-900 active:scale-95"
              : "bg-gray-100 text-gray-300 cursor-not-allowed"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          SNS 공유하기
        </button>
        <button
          onClick={() => badge.unlocked && onSave(badge)}
          disabled={!badge.unlocked}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
            badge.unlocked
              ? "border-hwaseong-blue text-hwaseong-blue hover:bg-hwaseong-light active:scale-95"
              : "border-gray-100 text-gray-300 cursor-not-allowed"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          이미지 저장
        </button>
      </div>
    </div>
  );
}

/* ─── 메인 페이지 ────────────────────────────────────────── */
export default function LearningDashboard() {
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleShare(badge: BadgeData) {
    const shareData = {
      title: `화성 AI 리더 허브 — ${badge.title} 배지 취득`,
      text: `저는 화성특례시 AI 시민 리더 플랫폼에서 '${badge.title}' 배지를 취득했습니다! ${badge.emoji}`,
      url: typeof window !== "undefined" ? window.location.origin : "",
    };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
        showToast("공유가 완료됐습니다! 🎉");
      } catch {
        // user cancelled
      }
    } else {
      navigator.clipboard.writeText(shareData.url);
      showToast("공유 링크가 클립보드에 복사됐습니다! 📋");
    }
  }

  function handleSave(badge: BadgeData) {
    // 실제 구현: html2canvas 또는 서버사이드 이미지 생성
    const link = document.createElement("a");
    link.href =
      "data:text/plain;charset=utf-8," +
      encodeURIComponent(`[화성 AI 리더 허브]\n${badge.title} 배지\n취득: ${badge.completedDate ?? ""}\n발급: ${badge.issuer}`);
    link.download = `화성AI리더허브_${badge.title}_배지.txt`;
    link.click();
    showToast(`'${badge.title}' 배지 파일이 저장됐습니다! 💾`);
  }

  const overallProgress = Math.round(((1 + 0.65) / 3) * 100); // step1 완료 + step2 65%

  return (
    <>
      <Head>
        <title>학습 대시보드 | 화성 AI 리더 허브</title>
      </Head>

      <DashboardLayout role="learner" userName="홍길동" pageTitle="학습 대시보드">

        {/* ── 전체 진도 요약 ── */}
        <div className="bg-gradient-to-br from-hwaseong-blue to-hwaseong-skyblue rounded-2xl p-6 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="flex-1">
              <p className="text-blue-200 text-xs font-medium mb-1">나의 학습 진도</p>
              <h2 className="text-2xl font-bold mb-1">
                2단계 심화 양성 <span className="text-yellow-300">수강 중</span>
              </h2>
              <p className="text-blue-100 text-sm">전체 로드맵의 {overallProgress}% 완료 · 인증 평가까지 1단계 남음</p>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-blue-200 mb-1.5">
                  <span>전체 진도</span>
                  <span>{overallProgress}%</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-300 rounded-full transition-all"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="flex-shrink-0 text-center bg-white/15 rounded-2xl px-8 py-5">
              <p className="text-4xl font-black">{overallProgress}%</p>
              <p className="text-blue-200 text-xs mt-1">학습 달성률</p>
            </div>
          </div>
        </div>

        {/* ── 학습 스테퍼 ── */}
        <section>
          <h2 className="font-bold text-hwaseong-text text-xl mb-6">나의 학습 로드맵</h2>

          {/* 상단 진행선 (데스크탑용 가로 스테퍼) */}
          <div className="hidden md:flex items-center mb-10 px-6">
            {STEPS.map((step, i) => (
              <div key={step.id} className="flex items-center flex-1 last:flex-none">
                {/* Step indicator */}
                <div className="flex flex-col items-center gap-2 flex-shrink-0">
                  <StepIcon status={step.status} id={step.id} />
                  <div className="text-center">
                    <p className={`text-xs font-bold ${
                      step.status === "completed" ? "text-green-600" :
                      step.status === "active"    ? "text-hwaseong-blue" :
                                                   "text-gray-400"
                    }`}>{step.label}</p>
                    <p className={`text-sm font-semibold ${
                      step.status === "locked" ? "text-gray-400" : "text-hwaseong-text"
                    }`}>{step.title}</p>
                  </div>
                </div>

                {/* Connector */}
                {i < STEPS.length - 1 && (
                  <div className="flex-1 mx-4 h-1 rounded-full relative overflow-hidden bg-gray-200">
                    <div
                      className={`h-full rounded-full transition-all ${
                        step.status === "completed" ? "bg-green-400 w-full" :
                        step.status === "active"    ? "bg-hwaseong-skyblue" :
                                                     "w-0"
                      }`}
                      style={step.status === "active" ? { width: `${step.progress}%` } : undefined}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 스텝 카드 목록 (세로) */}
          <div className="space-y-4">
            {STEPS.map((step, i) => {
              const isLast = i === STEPS.length - 1;
              return (
                <div key={step.id} className="flex gap-4">
                  {/* 모바일 세로 스테퍼 인디케이터 */}
                  <div className="md:hidden flex flex-col items-center gap-0 flex-shrink-0">
                    <StepIcon status={step.status} id={step.id} />
                    {!isLast && (
                      <div className="w-0.5 flex-1 mt-2 min-h-[24px]" style={{
                        background: step.status === "completed" ? "#22c55e" : "#e5e7eb"
                      }} />
                    )}
                  </div>

                  {/* 카드 */}
                  <div className={`flex-1 rounded-2xl border-2 p-5 mb-2 transition-all ${
                    step.status === "completed"
                      ? "border-green-200 bg-green-50"
                      : step.status === "active"
                      ? "border-hwaseong-blue bg-blue-50 shadow-md ring-1 ring-blue-100"
                      : "border-dashed border-gray-200 bg-gray-50"
                  }`}>
                    {/* 카드 헤더 */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                            step.status === "completed" ? "bg-green-200 text-green-800" :
                            step.status === "active"    ? "bg-hwaseong-blue text-white" :
                                                        "bg-gray-200 text-gray-500"
                          }`}>{step.label}</span>
                          {step.status === "active" && (
                            <span className="text-xs font-semibold text-hwaseong-blue flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-hwaseong-blue rounded-full animate-pulse" />
                              수강 중
                            </span>
                          )}
                          {step.status === "completed" && (
                            <span className="text-xs font-semibold text-green-600">✓ 완료</span>
                          )}
                        </div>
                        <h3 className={`font-bold text-base ${step.status === "locked" ? "text-gray-400" : "text-hwaseong-text"}`}>
                          {step.title}
                          <span className={`text-sm font-normal ml-2 ${step.status === "locked" ? "text-gray-300" : "text-gray-400"}`}>
                            {step.subtitle}
                          </span>
                        </h3>
                      </div>
                      {step.completedDate && (
                        <span className="text-xs text-green-600 bg-green-100 px-2.5 py-1 rounded-full flex-shrink-0">
                          {step.completedDate}
                        </span>
                      )}
                    </div>

                    <p className={`text-sm leading-relaxed mb-3 ${step.status === "locked" ? "text-gray-400" : "text-gray-600"}`}>
                      {step.desc}
                    </p>

                    {/* 과정 목록 */}
                    {step.courses.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {step.courses.map((c) => (
                          <span key={c} className={`text-xs px-2.5 py-1 rounded-full ${
                            step.status === "completed" ? "bg-green-100 text-green-700" :
                            step.status === "active"    ? "bg-blue-100 text-blue-700" :
                                                        "bg-gray-100 text-gray-400"
                          }`}>
                            {c}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* 수료증 */}
                    <p className={`text-xs font-medium flex items-center gap-1.5 ${
                      step.status === "locked" ? "text-gray-300" : "text-hwaseong-blue"
                    }`}>
                      🏅 {step.cert}
                    </p>

                    {/* STEP 2 진행도 */}
                    {step.status === "active" && step.progress !== undefined && (
                      <div className="mt-4 pt-4 border-t border-blue-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-500">수강 진도</span>
                            <span className="text-sm font-bold text-hwaseong-blue">{step.currentSession}</span>
                          </div>
                          <span className="text-sm font-bold text-hwaseong-blue">{step.progress}%</span>
                        </div>
                        <div className="h-2.5 bg-blue-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-hwaseong-blue rounded-full relative overflow-hidden"
                            style={{ width: `${step.progress}%` }}
                          >
                            <div className="absolute inset-0 bg-white/20 animate-pulse" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2.5">
                          <p className="text-xs text-gray-500">
                            📅 다음 강의: <span className="font-semibold text-hwaseong-text">{step.nextDate}</span>
                          </p>
                          <span className="text-xs text-orange-500 font-medium">
                            {100 - (step.progress ?? 0)}% 남음
                          </span>
                        </div>
                      </div>
                    )}

                    {/* 잠금 안내 */}
                    {step.status === "locked" && step.unlockCondition && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-gray-400 bg-gray-100 rounded-lg px-3 py-2">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {step.unlockCondition}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── 디지털 배지 ── */}
        <section>
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="font-bold text-hwaseong-text text-xl">디지털 배지</h2>
              <p className="text-sm text-gray-500 mt-1">
                과정 수료 및 인증 평가 통과 시 공식 디지털 배지가 발급됩니다
              </p>
            </div>
            <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1.5 rounded-full">
              1 / {BADGES.length} 취득
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {BADGES.map((badge) => (
              <BadgeCard
                key={badge.id}
                badge={badge}
                onShare={handleShare}
                onSave={handleSave}
              />
            ))}
          </div>

          {/* 배지 안내 */}
          <div className="mt-6 bg-hwaseong-light border border-blue-100 rounded-2xl p-5 flex gap-4">
            <div className="text-2xl flex-shrink-0">ℹ️</div>
            <div>
              <p className="font-semibold text-hwaseong-text text-sm mb-1">디지털 배지란?</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                디지털 배지는 화성특례시장이 공식 발급하는 학습 인증 자격입니다.
                SNS에 공유하거나 이미지로 저장하여 포트폴리오에 활용하세요.
                <span className="font-medium text-hwaseong-blue"> AI 시민 리더 배지</span>는 인증 평가 통과 후 발급됩니다.
              </p>
            </div>
          </div>
        </section>

        {/* ── 빠른 링크 ── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4">
          <Link href="/dashboard/learner">
            <div className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
              <div className="w-12 h-12 bg-hwaseong-light rounded-xl flex items-center justify-center text-2xl flex-shrink-0">📚</div>
              <div>
                <p className="font-semibold text-hwaseong-text text-sm">교육 과정 신청</p>
                <p className="text-xs text-gray-500 mt-0.5">개설 과정 전체 목록 보기</p>
              </div>
              <svg className="w-5 h-5 text-gray-300 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
          <div className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">📤</div>
            <div>
              <p className="font-semibold text-hwaseong-text text-sm">강사 파견 요청</p>
              <p className="text-xs text-gray-500 mt-0.5">우리 기관에 AI 강사 초청하기</p>
            </div>
            <svg className="w-5 h-5 text-gray-300 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </section>

      </DashboardLayout>

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm font-medium px-6 py-3 rounded-2xl shadow-2xl z-[100] animate-pulse">
          {toast}
        </div>
      )}
    </>
  );
}
