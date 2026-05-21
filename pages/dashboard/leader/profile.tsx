import Head from "next/head";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/lib/auth-context";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Bird, Backpack, BookOpen, Pencil, GraduationCap,
  Briefcase, Home, Smile,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ─── 상수 ─────────────────────────────────────────────────────────────────────

type AudienceTarget = { value: string; line1: string; line2?: string; Icon: LucideIcon; iconColor: string };

/** 강사 매칭 시 강사의 전문 분야와 대조하는 핵심 파라미터로 사용됨 */
const AUDIENCE_TARGETS: AudienceTarget[] = [
  { value: "초등(저학년)", line1: "초등",    line2: "저학년",   Icon: Bird,          iconColor: "text-yellow-500" },
  { value: "초등(고학년)", line1: "초등",    line2: "고학년",   Icon: Backpack,      iconColor: "text-orange-400" },
  { value: "중학생",       line1: "중학생",                     Icon: BookOpen,      iconColor: "text-blue-500"   },
  { value: "고등학생",     line1: "고등학생",                   Icon: Pencil,        iconColor: "text-indigo-500" },
  { value: "대학생",       line1: "대학생",                     Icon: GraduationCap, iconColor: "text-purple-500" },
  { value: "성인",         line1: "성인",                       Icon: Briefcase,     iconColor: "text-teal-600"   },
  { value: "학부모",       line1: "학부모",                     Icon: Home,          iconColor: "text-green-600"  },
  { value: "시니어(노인)", line1: "시니어",  line2: "노인",     Icon: Smile,         iconColor: "text-rose-400"   },
];

const SPECIALTY_GROUPS = [
  {
    group: "AI 기초·윤리",
    items: ["생성형 AI", "ChatGPT 활용", "AI 윤리", "AI 리터러시", "미디어 리터러시"],
  },
  {
    group: "프로그래밍·데이터",
    items: ["파이썬 기초", "데이터 분석", "코딩 기초", "노코드 도구", "엑셀·자동화"],
  },
  {
    group: "실용 AI 도구",
    items: ["이미지 생성 AI", "영상·편집 AI", "업무 자동화", "스마트폰 AI", "AI 글쓰기"],
  },
  {
    group: "교육 특화 대상",
    items: ["시니어 특화", "청소년 특화", "직장인 특화", "기초 입문자", "교원 연수"],
  },
];

const REGION_ZONES = [
  { zone: "동부권", sub: "동탄·기흥", items: ["동탄1동", "동탄2동", "동탄면", "기흥"] },
  { zone: "남부권", sub: "봉담·향남·팔탄", items: ["봉담읍", "향남읍", "발안", "팔탄면"] },
  { zone: "서부권", sub: "남양·마도·서신", items: ["남양읍", "마도면", "서신면", "우정읍", "장안면"] },
  { zone: "북부권", sub: "병점·기산·안녕", items: ["병점동", "기산동", "안녕동", "진안동"] },
];

const WEEKDAYS = [
  { key: "mon", label: "월" }, { key: "tue", label: "화" }, { key: "wed", label: "수" },
  { key: "thu", label: "목" }, { key: "fri", label: "금" }, { key: "sat", label: "토" }, { key: "sun", label: "일" },
];

const TIME_SLOTS = [
  { key: "morning",   label: "오전", sub: "09–12시" },
  { key: "afternoon", label: "오후", sub: "13–18시" },
  { key: "evening",   label: "저녁", sub: "18–21시" },
];

// ─── 서브 컴포넌트 ─────────────────────────────────────────────────────────────

function ProgressBar({
  label, current, required, unit = "", warn,
}: { label: string; current: number; required: number; unit?: string; warn?: boolean }) {
  const pct = Math.min(Math.round((current / required) * 100), 100);
  const done = current >= required;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-gray-600">{label}</span>
        <span className={`text-xs font-bold ${done ? "text-green-600" : warn ? "text-amber-600" : "text-gray-500"}`}>
          {current}{unit} / {required}{unit}
          {done && " ✓"}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${done ? "bg-green-500" : warn ? "bg-amber-400" : "bg-hwaseong-blue"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {!done && (
        <p className="text-[11px] text-gray-400 mt-0.5">
          {required - current}{unit} 더 필요
        </p>
      )}
    </div>
  );
}

function AdminPreviewCard({
  name, isVerified, specialties, availableRegions, weekdays, timeSlots, ratingAvg, totalLectures,
}: {
  name: string; isVerified: boolean;
  specialties: string[]; availableRegions: string[];
  weekdays: string[]; timeSlots: string[];
  ratingAvg: number; totalLectures: number;
}) {
  const [open, setOpen] = useState(false);
  const wdMap: Record<string, string> = { mon: "월", tue: "화", wed: "수", thu: "목", fri: "금", sat: "토", sun: "일" };
  const tsMap: Record<string, string> = { morning: "오전", afternoon: "오후", evening: "저녁" };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="w-8 h-8 bg-hwaseong-blue/10 text-hwaseong-blue rounded-xl flex items-center justify-center text-sm flex-shrink-0">
          👁
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black text-gray-700">운영자 뷰 미리보기</p>
          <p className="text-[11px] text-gray-400">관리자가 보는 내 프로필 카드</p>
        </div>
        <span className={`text-gray-400 text-xs transition-transform ${open ? "rotate-180" : ""}`}>▼</span>
      </button>

      {open && (
        <div className="border-t border-gray-100 p-5">
          {/* 운영자가 실제로 보는 카드 */}
          <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-gradient-to-r from-hwaseong-blue/5 to-indigo-50 px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 bg-hwaseong-blue rounded-xl flex items-center justify-center text-white font-black text-lg flex-shrink-0">
                {name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-hwaseong-text text-sm">{name}</span>
                  {isVerified && (
                    <span className="text-[10px] font-bold text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded-full">
                      ✓ 인증
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right text-xs flex-shrink-0">
                <p className="font-black text-amber-600">⭐ {ratingAvg.toFixed(1)}</p>
                <p className="text-gray-400">{totalLectures}회 강의</p>
              </div>
            </div>
            <div className="px-4 py-3 space-y-2.5">
              {specialties.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 mb-1.5">전문 분야</p>
                  <div className="flex flex-wrap gap-1.5">
                    {specialties.map((s) => (
                      <span key={s} className="text-[10px] bg-hwaseong-blue/10 text-hwaseong-blue font-semibold px-2 py-0.5 rounded-full">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {availableRegions.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 mb-1.5">활동 가능 지역</p>
                  <div className="flex flex-wrap gap-1">
                    {availableRegions.map((r) => (
                      <span key={r} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        📍 {r}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {(weekdays.length > 0 || timeSlots.length > 0) && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 mb-1.5">강의 가능 시간</p>
                  <div className="flex flex-wrap gap-1">
                    {weekdays.map((d) => (
                      <span key={d} className="text-[10px] bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">
                        {wdMap[d]}
                      </span>
                    ))}
                    {timeSlots.map((t) => (
                      <span key={t} className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                        {tsMap[t]}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <p className="text-[11px] text-gray-400 text-center mt-2">
            💡 저장 후 즉시 반영됩니다. 평점·강의 수는 시스템이 자동 집계합니다.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────

type Tab = "competency" | "availability" | "certification";

export default function LeaderProfilePage() {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("competency");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // 폼 상태
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [preferredAudiences, setPreferredAudiences] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [weekdays, setWeekdays] = useState<string[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);

  // 인증 초기화
  useEffect(() => {
    if (!loading && (!user || user.role !== "leader")) {
      router.replace("/login");
      return;
    }
    // 관리자 인증 처리 후 세션에 반영되도록 최신 프로필 재조회
    refresh();
    if (!user?.leaderProfile) return;
    const lp = user.leaderProfile;
    setSpecialties(lp.specialties ?? []);
    setPreferredAudiences(lp.preferredAudiences ?? []);
    setRegions(lp.availableRegions ?? []);
    setWeekdays(lp.availableTimes?.weekdays ?? []);
    setTimeSlots(lp.availableTimes?.time_slots ?? []);
  }, [loading, user, router]);

  // 프로필 저장
  const save = useCallback(async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/leaders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio: bio.trim() || undefined,
          phone: phone.trim() || undefined,
          specialties,
          preferredAudiences,
          availableRegions: regions,
          availableTimes:
            weekdays.length > 0 || timeSlots.length > 0
              ? { weekdays, time_slots: timeSlots }
              : null,
        }),
      });
      if (res.ok) {
        await refresh();
        setSaveMsg({ ok: true, text: "프로필이 저장되었습니다." });
      } else {
        const err = await res.json().catch(() => ({}));
        setSaveMsg({ ok: false, text: (err as { error?: string }).error ?? "저장에 실패했습니다." });
      }
    } catch {
      setSaveMsg({ ok: false, text: "네트워크 오류가 발생했습니다." });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 4000);
    }
  }, [bio, phone, specialties, preferredAudiences, regions, weekdays, timeSlots, refresh]);

  // 전문 분야 토글
  const toggleSpecialty = useCallback((s: string) => {
    setSpecialties((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }, []);

  // 선호 교육 대상 토글
  const toggleAudience = useCallback((a: string) => {
    setPreferredAudiences((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);
  }, []);

  // 지역 토글 + 권역 전체 선택
  const toggleRegion = useCallback((r: string) => {
    setRegions((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);
  }, []);

  const toggleZone = useCallback((items: string[]) => {
    setRegions((prev) => {
      const allSelected = items.every((i) => prev.includes(i));
      return allSelected
        ? prev.filter((r) => !items.includes(r))
        : [...new Set([...prev, ...items])];
    });
  }, []);

  const toggleWeekday = useCallback((d: string) => {
    setWeekdays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  }, []);

  const toggleTimeSlot = useCallback((t: string) => {
    setTimeSlots((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  }, []);

  const lp = user?.leaderProfile;
  const ratingAvg = lp?.ratingAvg ?? 0;
  const totalLectures = lp?.totalLectures ?? 0;

  const availabilityGrid = useMemo(() => {
    return WEEKDAYS.map((wd) => ({
      ...wd,
      times: TIME_SLOTS.map((ts) => ({
        ...ts,
        active: weekdays.includes(wd.key) && timeSlots.includes(ts.key),
      })),
    }));
  }, [weekdays, timeSlots]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-hwaseong-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Head><title>강사 프로필 관리 | 화성 AI 시민리더 잇다</title></Head>
      <DashboardLayout pageTitle="강사 프로필 관리">

        {/* 헤더 */}
        <div className="bg-gradient-to-br from-hwaseong-blue to-indigo-700 rounded-3xl p-6">
          <button
            onClick={() => router.push("/dashboard/leader")}
            className="flex items-center gap-1.5 text-white/60 text-xs mb-4 hover:text-white transition-colors"
          >
            ← 대시보드
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 border-2 border-white/30 rounded-2xl flex items-center justify-center text-3xl font-black text-white flex-shrink-0">
              {user.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h2 className="text-xl font-black text-white">{user.name}</h2>
                {lp?.isVerified && (
                  <span className="text-[10px] font-bold bg-green-400/20 text-green-200 border border-green-400/40 px-2 py-0.5 rounded-full">
                    ✓ 공식 인증
                  </span>
                )}
              </div>
              <p className="text-blue-200 text-xs">{user.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            {[
              { label: "전문 분야", value: `${specialties.length}개` },
              { label: "활동 지역", value: `${regions.length}곳` },
              { label: "가능 요일", value: weekdays.length > 0 ? `${weekdays.length}일` : "미설정" },
            ].map((s) => (
              <div key={s.label} className="bg-white/10 rounded-2xl py-3 text-center">
                <p className="text-white font-bold text-base leading-none">{s.value}</p>
                <p className="text-blue-300 text-[10px] mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 운영자 뷰 미리보기 */}
        <AdminPreviewCard
          name={user.name}
          isVerified={lp?.isVerified ?? false}
          specialties={specialties}
          availableRegions={regions}
          weekdays={weekdays}
          timeSlots={timeSlots}
          ratingAvg={ratingAvg}
          totalLectures={totalLectures}
        />

        {/* 탭 */}
        <div className="flex bg-gray-100 rounded-2xl p-1 gap-1">
          {(
            [
              { key: "competency",   icon: "🎯", label: "역량 설정" },
              { key: "availability", icon: "📍", label: "가용성 설정" },
              { key: "certification",icon: "🏅", label: "인증 현황" },
            ] as { key: Tab; icon: string; label: string }[]
          ).map(({ key, icon, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                tab === key ? "bg-white text-hwaseong-blue shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        {/* ── 역량 설정 ── */}
        {tab === "competency" && (
          <div className="space-y-5">
            {/* 자기소개 */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
              <h3 className="font-bold text-hwaseong-text text-sm flex items-center gap-2">
                <span className="w-6 h-6 bg-hwaseong-blue text-white text-xs font-black rounded-lg flex items-center justify-center">1</span>
                자기소개
              </h3>
              <textarea
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="AI 강의 경험, 주요 교육 대상, 강의 철학 등을 소개해 주세요.&#10;&#10;예시: 5년간 시니어 대상 스마트폰·AI 교육을 진행해 왔습니다. 어렵고 복잡한 내용도 쉽고 재미있게 전달하는 것을 중요시합니다."
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30 resize-none leading-relaxed"
              />
              <div className="flex justify-between text-[11px] text-gray-400">
                <span>운영자 및 매칭 시 수요처에게 공개됩니다.</span>
                <span>{bio.length}자</span>
              </div>
            </div>

            {/* 연락처 */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
              <h3 className="font-bold text-hwaseong-text text-sm flex items-center gap-2">
                <span className="w-6 h-6 bg-hwaseong-blue text-white text-xs font-black rounded-lg flex items-center justify-center">2</span>
                연락처
              </h3>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010-0000-0000"
                className="w-full px-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30"
              />
              <p className="text-[11px] text-blue-600 bg-blue-50 rounded-xl px-3 py-2.5">
                🔒 매칭이 확정된 이후에만 수요처에게 공개됩니다 (안심 매칭).
              </p>
            </div>

            {/* 선호/특화 교육 대상 */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-hwaseong-text text-sm flex items-center gap-2">
                  <span className="w-6 h-6 bg-hwaseong-blue text-white text-xs font-black rounded-lg flex items-center justify-center">3</span>
                  선호/특화 교육 대상
                </h3>
                <span className="text-xs text-hwaseong-blue font-bold bg-hwaseong-blue/10 px-2.5 py-1 rounded-full">
                  {preferredAudiences.length}개 선택
                </span>
              </div>
              <p className="text-xs text-gray-400">
                주로 강의하는 교육 대상을 선택하세요. 운영자가 매칭할 때{" "}
                <span className="font-semibold text-hwaseong-blue">대상 적합도 점수(최대 +10pt)</span>로 반영됩니다.
              </p>

              <div className="grid grid-cols-4 gap-2">
                {AUDIENCE_TARGETS.map((opt) => {
                  const isSelected = preferredAudiences.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleAudience(opt.value)}
                      className={`relative flex flex-col items-center gap-1 rounded-2xl border-2 py-3.5 px-1 transition-all duration-150 ${
                        isSelected
                          ? "border-hwaseong-blue bg-hwaseong-blue text-white shadow-lg shadow-hwaseong-blue/20"
                          : "border-gray-200 bg-gray-50 hover:border-hwaseong-blue/40 hover:bg-hwaseong-light"
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute top-1 right-1 w-4 h-4 bg-white/25 rounded-full flex items-center justify-center">
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                            <path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      )}
                      <opt.Icon size={20} className={isSelected ? "text-white" : opt.iconColor} strokeWidth={1.8} />
                      <span className={`text-[11px] font-bold leading-tight text-center ${isSelected ? "text-white" : "text-gray-700"}`}>
                        {opt.line1}
                      </span>
                      {opt.line2 && (
                        <span className={`text-[10px] leading-tight text-center ${isSelected ? "text-white/80" : "text-gray-400"}`}>
                          {opt.line2}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="bg-purple-50 border border-purple-100 rounded-xl px-3 py-2.5 text-xs text-purple-700 flex items-center justify-between">
                <span>💡 강의 이력 기반 <strong>강점 배지</strong>는 포트폴리오에서 자동 생성됩니다.</span>
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/leader/portfolio")}
                  className="ml-2 font-bold underline underline-offset-2 flex-shrink-0"
                >
                  포트폴리오 →
                </button>
              </div>
            </div>

            {/* 전문 분야 체크박스 */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-hwaseong-text text-sm flex items-center gap-2">
                  <span className="w-6 h-6 bg-hwaseong-blue text-white text-xs font-black rounded-lg flex items-center justify-center">4</span>
                  전문 분야
                </h3>
                <span className="text-xs text-hwaseong-blue font-bold bg-hwaseong-blue/10 px-2.5 py-1 rounded-full">
                  {specialties.length}개 선택
                </span>
              </div>
              <p className="text-xs text-gray-400">실제로 강의 가능한 분야만 선택해 주세요. 매칭 점수에 반영됩니다.</p>

              {SPECIALTY_GROUPS.map(({ group, items }) => {
                const groupSelected = items.filter((i) => specialties.includes(i)).length;
                return (
                  <div key={group}>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-xs font-black text-gray-500 uppercase tracking-wide">{group}</p>
                      {groupSelected > 0 && (
                        <span className="text-[10px] text-hwaseong-blue font-bold bg-hwaseong-blue/10 px-1.5 py-0.5 rounded-full">
                          {groupSelected}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {items.map((item) => {
                        const selected = specialties.includes(item);
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => toggleSpecialty(item)}
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left text-sm transition-all ${
                              selected
                                ? "bg-hwaseong-blue border-hwaseong-blue text-white shadow-sm shadow-hwaseong-blue/20"
                                : "bg-white border-gray-200 text-gray-600 hover:border-hwaseong-blue/40 hover:bg-hwaseong-blue/5"
                            }`}
                          >
                            <span className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center text-[10px] ${
                              selected ? "bg-white border-white text-hwaseong-blue" : "border-gray-300"
                            }`}>
                              {selected && "✓"}
                            </span>
                            <span className="text-xs font-semibold leading-tight">{item}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 가용성 설정 ── */}
        {tab === "availability" && (
          <div className="space-y-5">
            {/* 활동 가능 지역 */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-hwaseong-text text-sm flex items-center gap-2">
                  <span className="w-6 h-6 bg-hwaseong-blue text-white text-xs font-black rounded-lg flex items-center justify-center">1</span>
                  활동 가능 지역
                </h3>
                <span className="text-xs text-hwaseong-blue font-bold bg-hwaseong-blue/10 px-2.5 py-1 rounded-full">
                  {regions.length}곳 선택
                </span>
              </div>
              <p className="text-xs text-gray-400">화성시 권역별로 실제 이동 가능한 지역을 선택해 주세요.</p>

              {REGION_ZONES.map(({ zone, sub, items }) => {
                const allSelected = items.every((i) => regions.includes(i));
                const someSelected = items.some((i) => regions.includes(i));
                return (
                  <div key={zone} className="border border-gray-100 rounded-2xl overflow-hidden">
                    {/* 권역 헤더 — 전체 선택 */}
                    <button
                      type="button"
                      onClick={() => toggleZone(items)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                        allSelected ? "bg-hwaseong-blue/5" : "bg-gray-50 hover:bg-gray-100"
                      }`}
                    >
                      <span className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center text-[10px] transition-all ${
                        allSelected
                          ? "bg-hwaseong-blue border-hwaseong-blue text-white"
                          : someSelected
                          ? "bg-hwaseong-blue/20 border-hwaseong-blue text-hwaseong-blue"
                          : "border-gray-300 bg-white"
                      }`}>
                        {allSelected ? "✓" : someSelected ? "—" : ""}
                      </span>
                      <div>
                        <span className="text-sm font-bold text-hwaseong-text">{zone}</span>
                        <span className="text-xs text-gray-400 ml-2">{sub}</span>
                      </div>
                      <span className={`ml-auto text-[10px] font-bold ${allSelected ? "text-hwaseong-blue" : "text-gray-400"}`}>
                        {allSelected ? "전체 선택됨" : someSelected ? `${items.filter(i => regions.includes(i)).length}/${items.length}` : "전체 선택"}
                      </span>
                    </button>
                    {/* 세부 지역 */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3">
                      {items.map((r) => {
                        const selected = regions.includes(r);
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => toggleRegion(r)}
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${
                              selected
                                ? "bg-hwaseong-blue border-hwaseong-blue text-white shadow-sm"
                                : "bg-white border-gray-200 text-gray-600 hover:border-hwaseong-blue/40"
                            }`}
                          >
                            <span className="text-xs">📍</span>
                            <span className="text-xs font-semibold">{r}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 강의 가능 시간 그리드 */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
              <h3 className="font-bold text-hwaseong-text text-sm flex items-center gap-2">
                <span className="w-6 h-6 bg-hwaseong-blue text-white text-xs font-black rounded-lg flex items-center justify-center">2</span>
                강의 가능 요일·시간대
              </h3>

              {/* 요일 선택 */}
              <div>
                <p className="text-xs font-bold text-gray-500 mb-2">가능 요일</p>
                <div className="flex gap-2 flex-wrap">
                  {WEEKDAYS.map(({ key, label }) => {
                    const selected = weekdays.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleWeekday(key)}
                        className={`w-11 h-11 rounded-xl text-sm font-bold border-2 transition-all ${
                          selected
                            ? "bg-hwaseong-blue border-hwaseong-blue text-white shadow-sm"
                            : "bg-white border-gray-200 text-gray-600 hover:border-hwaseong-blue/40"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 시간대 선택 */}
              <div>
                <p className="text-xs font-bold text-gray-500 mb-2">가능 시간대</p>
                <div className="space-y-2">
                  {TIME_SLOTS.map(({ key, label, sub }) => {
                    const selected = timeSlots.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleTimeSlot(key)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left ${
                          selected
                            ? "bg-hwaseong-blue/5 border-hwaseong-blue text-hwaseong-blue"
                            : "bg-white border-gray-200 text-gray-600 hover:border-hwaseong-blue/40"
                        }`}
                      >
                        <span className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center text-[10px] ${
                          selected ? "bg-hwaseong-blue border-hwaseong-blue text-white" : "border-gray-300"
                        }`}>
                          {selected && "✓"}
                        </span>
                        <span className="font-semibold text-sm">{label}</span>
                        <span className="text-xs text-gray-400">{sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 그리드 시각화 */}
              {(weekdays.length > 0 || timeSlots.length > 0) && (
                <div>
                  <p className="text-xs font-bold text-gray-500 mb-2">가용성 그리드 미리보기</p>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[280px]">
                      <thead>
                        <tr>
                          <th className="w-10" />
                          {TIME_SLOTS.map(({ key, label, sub }) => (
                            <th key={key} className={`pb-2 text-center ${timeSlots.includes(key) ? "opacity-100" : "opacity-30"}`}>
                              <p className="text-[11px] font-bold text-gray-700">{label}</p>
                              <p className="text-[9px] text-gray-400">{sub}</p>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {availabilityGrid.map((row) => (
                          <tr key={row.key}>
                            <td className={`py-1 pr-2 text-center text-xs font-bold ${weekdays.includes(row.key) ? "text-hwaseong-text" : "text-gray-300"}`}>
                              {row.label}
                            </td>
                            {row.times.map((cell) => (
                              <td key={cell.key} className="py-1 text-center">
                                <div className={`mx-auto w-10 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                                  cell.active
                                    ? "bg-hwaseong-blue text-white shadow-sm"
                                    : weekdays.includes(row.key) && timeSlots.includes(cell.key)
                                    ? "bg-hwaseong-blue text-white"
                                    : "bg-gray-100 text-gray-300"
                                }`}>
                                  {cell.active ? "✓" : "—"}
                                </div>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[11px] text-gray-400 text-center mt-2">
                    파란 칸이 강의 가능한 시간입니다.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 인증 현황 ── */}
        {tab === "certification" && (
          <div className="space-y-4">
            {/* 인증 상태 카드 */}
            <div className={`rounded-2xl p-5 border ${lp?.isVerified ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center border-2 bg-white shadow-sm ${lp?.isVerified ? "border-green-300" : "border-amber-300"}`}>
                  <span className="text-2xl font-black" style={{ lineHeight: 1 }}>
                    {lp?.isVerified ? "🏅" : "⏳"}
                  </span>
                </div>
                <div>
                  <p className={`text-lg font-black ${lp?.isVerified ? "text-green-700" : "text-amber-700"}`}>
                    {lp?.isVerified ? "인증 완료" : "인증 심사 대기 중"}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs font-semibold opacity-70">
                    {lp?.isVerified ? (
                      <span className="flex items-center gap-1 text-green-700">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        화성특례시 공식 인증 완료
                      </span>
                    ) : (
                      <span className="text-amber-700">관리자 검토 후 인증이 부여됩니다.</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                    <span className="font-bold">⭐ {ratingAvg.toFixed(1)}</span>
                    <span className="font-bold">📚 {totalLectures}회</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 인증 요청 안내 */}
            {!lp?.isVerified && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                <span className="text-xl flex-shrink-0 mt-0.5">⏳</span>
                <div>
                  <p className="text-sm font-bold text-amber-800">인증 심사 대기 중</p>
                  <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                    프로필을 완성하고 자격증 정보를 등록하면 관리자가 인증을 검토합니다.
                    인증 완료 후 매칭 요청을 받을 수 있습니다.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 저장 버튼 (인증 현황 탭 제외) */}
        {tab !== "certification" && (
          <div className="space-y-3 pb-4">
            {saveMsg && (
              <div className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-sm font-semibold ${
                saveMsg.ok ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-700"
              }`}>
                <span>{saveMsg.ok ? "✅" : "❌"}</span>
                <span>{saveMsg.text}</span>
              </div>
            )}
            <button
              onClick={save}
              disabled={saving}
              className="w-full py-4 bg-hwaseong-blue text-white font-black text-base rounded-2xl hover:bg-blue-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-hwaseong-blue/20"
            >
              {saving ? (
                <><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />저장 중...</>
              ) : (
                <>💾 프로필 저장하기</>
              )}
            </button>
          </div>
        )}

      </DashboardLayout>
    </>
  );
}
