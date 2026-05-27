/**
 * 화성시 AI 시민리더 허브 - 매칭 알고리즘 v4.0 (TypeScript)
 *
 * v4 변경 사항:
 *   - 전문분야 유사도 그룹 추가 (직접 일치 40pt, 유사 그룹 20pt)
 *   - 시간 점수 부분 일치 추가 (완전 20pt, 부분 10pt)
 *   - 권역 가드 패널티 추가 (권역 0점이면 -20pt)
 *   - 인접 권역 수정 (동부↔남부 추가)
 *   - 신규 강사 기준 5회 → 10회 상향
 *   - 평점 보너스 기준 조정 (4.8↑ +10, 4.5~4.7 +5)
 *   - 활동일 패널티 기준 조정 (3개월/6개월)
 *   - 기관 유형 보너스 추가 (학교·기업·복지관)
 *   - 정기 강의 보너스 추가
 *   - 매칭 모드 확장
 */

export type MatchMode =
  | "정상"
  | "인접권역추천"
  | "유사분야확장"
  | "조건완화추천"
  | "최선추천";

export interface AlgoLeader {
  availableRegions: string[];
  specialties: string[];
  availableTimes: { weekdays?: string[]; time_slots?: string[] } | null;
  ratingAvg: number;
  totalLectures: number;
  maxClassesMonth: number;
  currentMonthLectures: number;
  lastLectureDate: string | null;
  certLevel?: number | null; // 1=기초, 2=중급, 3=전문가
}

export interface AlgoRequest {
  address: string | null;
  category: string;
  startDate: string | null;
  institutionType?: string | null;
  frequency?: string | null;
}

export interface MatchScoreBreakdown {
  totalScore: number;
  baseScore: number;
  regionScore: number;
  specialtyScore: number;
  timeScore: number;
  bonusScore: number;
  penaltyScore: number;
  bonuses: string[];
  penalties: string[];
  matchMode: MatchMode;
}

// ── 전문 분야 유사도 그룹 ─────────────────────────────────────────────────
const SPECIALTY_GROUPS: Record<string, string[]> = {
  "AI 기초·윤리":   ["생성형 AI", "ChatGPT 활용", "AI 윤리", "AI 리터러시", "미디어 리터러시"],
  "프로그래밍·데이터": ["파이썬 기초", "데이터 분석", "코딩 기초", "노코드 도구", "엑셀·자동화"],
  "창의·융합":      ["메이커 교육", "로봇 코딩", "AI 예술", "SW 융합", "디지털 리터러시"],
  "비즈니스·실무":  ["AI 업무 혁신", "챗봇 활용", "영상 제작", "소셜미디어", "AI 마케팅"],
};

// ── 권역 정의 ─────────────────────────────────────────────────────────────
const REGION_MAP: Record<string, string[]> = {
  동부권: ["동탄1", "동탄2", "동탄1동", "동탄2동", "동탄면", "기흥"],
  서부권: ["향남", "향남읍", "팔탄", "팔탄면"],
  북부권: ["봉담", "봉담읍", "기안", "병점동", "기산동", "안녕동", "진안동"],
  남부권: ["우정", "우정읍", "장안", "장안면", "발안", "마도면", "서신면"],
  중부권: ["화성시청", "남양", "남양읍"],
};

// ── 인접 권역 (Python region_service 기준) ───────────────────────────────
const ADJACENT: Record<string, string[]> = {
  동부권: ["중부권", "남부권"],
  서부권: ["중부권", "북부권"],
  북부권: ["중부권", "서부권"],
  남부권: ["중부권", "동부권"],
  중부권: ["동부권", "서부권", "북부권", "남부권"],
};

const NEW_INSTRUCTOR_THRESHOLD = 10;
const REGION_GUARD_PENALTY = -20;

const DAY_KEY = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

// ── 유틸 ─────────────────────────────────────────────────────────────────

function getSpecialtyGroup(specialty: string): string | null {
  for (const [group, items] of Object.entries(SPECIALTY_GROUPS)) {
    if (items.includes(specialty)) return group;
  }
  return null;
}

function getGroupSpecialties(specialty: string): string[] {
  for (const items of Object.values(SPECIALTY_GROUPS)) {
    if (items.includes(specialty)) return items;
  }
  return [];
}

function addressToRegion(address: string): string | null {
  // 이미 권역명이면 그대로 반환
  if (ADJACENT[address]) return address;
  // 세부 지역명 → 권역명
  for (const [region, keywords] of Object.entries(REGION_MAP)) {
    if (keywords.some((k) => address.includes(k))) return region;
  }
  // prefix 매칭 (예: '동탄' → 동부권)
  for (const [region, keywords] of Object.entries(REGION_MAP)) {
    for (const k of keywords) {
      if (k.startsWith(address) || address.startsWith(k)) return region;
    }
  }
  return null;
}

function normalizeRegion(name: string | null | undefined): string | null {
  if (!name) return null;
  return addressToRegion(name) ?? name;
}

function monthsDiff(from: Date, to: Date): number {
  return (
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth())
  );
}

// ── 지역 점수 (최대 40pt) ─────────────────────────────────────────────────

function calcRegionScore(
  leader: AlgoLeader,
  reqAddress: string | null
): { score: number; mode: MatchMode } {
  const reqRegion = normalizeRegion(reqAddress);
  if (!reqRegion) return { score: 0, mode: "정상" };

  const leaderRegions = leader.availableRegions.map((r) => normalizeRegion(r) ?? r);

  if (leaderRegions.includes(reqRegion)) return { score: 40, mode: "정상" };

  const adjacent = ADJACENT[reqRegion] ?? [];
  if (leaderRegions.some((lr) => adjacent.includes(lr)))
    return { score: 20, mode: "인접권역추천" };

  return { score: 0, mode: "정상" };
}

// ── 전문분야 점수 (최대 40pt) ─────────────────────────────────────────────

function calcSpecialtyScore(
  leader: AlgoLeader,
  category: string
): { score: number; mode: MatchMode } {
  // 직접 일치 (40pt)
  const catWords = category.split(/[\s,·]+/).filter(Boolean);
  const hasExact = leader.specialties.some((s) =>
    catWords.some((w) => s.toLowerCase().includes(w.toLowerCase()) || w.toLowerCase().includes(s.toLowerCase()))
  );
  if (hasExact) return { score: 40, mode: "정상" };

  // 유사 그룹 일치 (20pt)
  const reqGroups = new Set(catWords.map((w) => getSpecialtyGroup(w)).filter(Boolean));
  const hasGroupMatch = leader.specialties.some((s) => {
    const g = getSpecialtyGroup(s);
    return g && reqGroups.has(g);
  });
  if (hasGroupMatch) return { score: 20, mode: "유사분야확장" };

  // 카테고리 키워드가 그룹에 속하는 항목과 겹치는지 추가 확인
  const reqGroupSpecialties = new Set(
    catWords.flatMap((w) => getGroupSpecialties(w))
  );
  if (reqGroupSpecialties.size > 0) {
    const hasGroupOverlap = leader.specialties.some((s) => reqGroupSpecialties.has(s));
    if (hasGroupOverlap) return { score: 20, mode: "유사분야확장" };
  }

  return { score: 0, mode: "정상" };
}

// ── 시간 점수 (최대 20pt) ─────────────────────────────────────────────────

function calcTimeScore(leader: AlgoLeader, startDate: string | null): number {
  const weekdays = leader.availableTimes?.weekdays ?? [];
  if (weekdays.length === 0) return 0;

  if (startDate) {
    const dayIdx = new Date(startDate).getDay();
    if (weekdays.includes(DAY_KEY[dayIdx])) return 20;
    // 강사는 가용 요일이 있지만 요청 날짜와 불일치 → 부분 점수
    return 10;
  }

  // 날짜 정보 없음 + 강사에게 가용 시간이 있으면 부분 점수
  return 10;
}

// ── 평점 보너스 ────────────────────────────────────────────────────────────

function calcRatingBonus(ratingAvg: number): { bonus: number; reason: string } {
  if (ratingAvg >= 4.8) return { bonus: 10, reason: `평점 ${ratingAvg.toFixed(1)} (4.8 이상) +10` };
  if (ratingAvg >= 4.5) return { bonus: 5,  reason: `평점 ${ratingAvg.toFixed(1)} (4.5~4.7) +5` };
  return { bonus: 0, reason: "" };
}

// ── 활동일 패널티 ──────────────────────────────────────────────────────────

function calcActivityPenalty(lastLectureDate: string | null): { penalty: number; reason: string } {
  if (!lastLectureDate) return { penalty: 5, reason: "활동 이력 없음 -5" };
  const months = monthsDiff(new Date(lastLectureDate), new Date());
  if (months <= 3) return { penalty: 0, reason: "" };
  if (months <= 6) return { penalty: 5,  reason: `${months}개월 비활동 (3~6개월) -5` };
  return { penalty: 10, reason: `${months}개월 비활동 (6개월 초과) -10` };
}

// ── 부하 패널티 ────────────────────────────────────────────────────────────

function calcLoadPenalty(
  maxClassesMonth: number,
  currentMonthLectures: number
): { penalty: number; reason: string } {
  if (maxClassesMonth <= 0) return { penalty: 0, reason: "" };
  const ratio = currentMonthLectures / maxClassesMonth;
  if (ratio >= 0.8)
    return {
      penalty: 15,
      reason: `이번 달 ${currentMonthLectures}/${maxClassesMonth}회 (80% 이상) -15`,
    };
  return { penalty: 0, reason: "" };
}

// ── 신규 강사 보너스 ───────────────────────────────────────────────────────

function calcNewInstructorBonus(totalLectures: number): { bonus: number; reason: string } {
  if (totalLectures < NEW_INSTRUCTOR_THRESHOLD)
    return { bonus: 20, reason: `신규 강사 (누적 ${totalLectures}회) +20` };
  return { bonus: 0, reason: "" };
}

// ── 기관 유형 보너스 (B항) ─────────────────────────────────────────────────

function calcOrgTypeBonus(
  leader: AlgoLeader,
  institutionType: string | null | undefined
): { bonus: number; reason: string } {
  if (!institutionType) return { bonus: 0, reason: "" };

  if (institutionType.includes("학교")) {
    if (leader.totalLectures >= 30)
      return { bonus: 10, reason: `기관유형=학교 + 누적 강의 ${leader.totalLectures}회 +10` };
    return { bonus: 0, reason: "" };
  }
  if (institutionType.includes("기업") || institutionType.includes("회사")) {
    if (leader.certLevel === 3)
      return { bonus: 10, reason: "기관유형=기업 + 전문가 인증 +10" };
    return { bonus: 0, reason: "" };
  }
  if (institutionType.includes("복지관")) {
    // target_audience 데이터가 없으므로 전체 강사에게 기회 부여
    return { bonus: 10, reason: "기관유형=복지관 +10" };
  }

  return { bonus: 0, reason: "" };
}

// ── 정기 강의 보너스 (D항) ─────────────────────────────────────────────────

function calcRegularBonus(
  leader: AlgoLeader,
  frequency: string | null | undefined
): { bonus: number; reason: string } {
  if (!frequency?.includes("정기")) return { bonus: 0, reason: "" };
  if ((leader.maxClassesMonth ?? 0) >= 3)
    return { bonus: 10, reason: `정기 강의 + 월 ${leader.maxClassesMonth}회 가능 +10` };
  return { bonus: 0, reason: "" };
}

// ── 종합 점수 계산 ─────────────────────────────────────────────────────────

export function calculateMatchScore(
  leader: AlgoLeader,
  request: AlgoRequest
): MatchScoreBreakdown {
  // 기본 점수
  const { score: regionScore, mode: regionMode } = calcRegionScore(leader, request.address);
  const { score: specialtyScore, mode: specialtyMode } = calcSpecialtyScore(leader, request.category);
  const timeScore = calcTimeScore(leader, request.startDate);
  const baseScore = regionScore + specialtyScore + timeScore;

  const bonuses: string[] = [];
  const penalties: string[] = [];

  // 권역 가드 패널티: 권역 점수 0이면 다른 보너스로 역전되지 않도록 -20
  const reqRegion = normalizeRegion(request.address);
  if (reqRegion && regionScore === 0) {
    penalties.push(`권역 부적합 가드 ${REGION_GUARD_PENALTY}`);
  }

  // 평점 보너스
  const { bonus: ratingBonus, reason: ratingReason } = calcRatingBonus(leader.ratingAvg);
  if (ratingBonus > 0) bonuses.push(ratingReason);

  // 활동일 패널티
  const { penalty: actPenalty, reason: actReason } = calcActivityPenalty(leader.lastLectureDate);
  if (actPenalty > 0) penalties.push(actReason);

  // 부하 패널티
  const { penalty: loadPenalty, reason: loadReason } = calcLoadPenalty(
    leader.maxClassesMonth, leader.currentMonthLectures
  );
  if (loadPenalty > 0) penalties.push(loadReason);

  // 신규 강사 보너스
  const { bonus: newBonus, reason: newReason } = calcNewInstructorBonus(leader.totalLectures);
  if (newBonus > 0) bonuses.push(newReason);

  // 기관 유형 보너스
  const { bonus: orgBonus, reason: orgReason } = calcOrgTypeBonus(leader, request.institutionType);
  if (orgBonus > 0) bonuses.push(orgReason);

  // 정기 강의 보너스
  const { bonus: regBonus, reason: regReason } = calcRegularBonus(leader, request.frequency);
  if (regBonus > 0) bonuses.push(regReason);

  const bonusScore =
    ratingBonus + newBonus + orgBonus + regBonus;
  const penaltyScore =
    (reqRegion && regionScore === 0 ? Math.abs(REGION_GUARD_PENALTY) : 0) +
    actPenalty + loadPenalty;

  const totalScore = Math.max(0, baseScore + bonusScore - penaltyScore);

  // 매칭 모드 결정
  let matchMode: MatchMode = "정상";
  if (regionScore === 20) matchMode = "인접권역추천";
  else if (specialtyMode === "유사분야확장") matchMode = "유사분야확장";
  else if (totalScore > 0 && baseScore === 0) matchMode = "최선추천";

  return {
    totalScore,
    baseScore,
    regionScore,
    specialtyScore,
    timeScore,
    bonusScore,
    penaltyScore,
    bonuses,
    penalties,
    matchMode,
  };
}
