// 화성시 캡스톤 매칭 알고리즘
// 기준: 지역(40) + 분야(40) + 시간(20) = 100 기본 점수 + 보너스/패널티

export type MatchMode = "정확" | "인접" | "전체";

export interface AlgoLeader {
  availableRegions: string[];
  specialties: string[];
  availableTimes: { weekdays?: string[]; time_slots?: string[] } | null;
  ratingAvg: number;
  totalLectures: number;
  maxClassesMonth: number;
  currentMonthLectures: number;
  lastLectureDate: string | null;
}

export interface AlgoRequest {
  address: string | null;
  category: string;
  startDate: string | null;
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

// 화성시 5개 권역과 대표 키워드
const REGION_MAP: Record<string, string[]> = {
  동부권: ["동탄"],
  서부권: ["향남", "팔탄"],
  북부권: ["봉담", "기안"],
  남부권: ["우정", "장안"],
  중부권: ["화성시청", "남양"],
};

// 인접 권역 (정확 매칭 실패 시 부분 점수)
const ADJACENT: Record<string, string[]> = {
  동부권: ["중부권"],
  서부권: ["중부권", "남부권"],
  북부권: ["중부권"],
  남부권: ["서부권"],
  중부권: ["동부권", "북부권", "서부권"],
};

const DAY_KEY = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function addressToRegion(address: string): string | null {
  for (const [region, keywords] of Object.entries(REGION_MAP)) {
    if (keywords.some((k) => address.includes(k))) return region;
  }
  return null;
}

function monthsDiff(from: Date, to: Date): number {
  return (
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth())
  );
}

export function calculateMatchScore(
  leader: AlgoLeader,
  request: AlgoRequest
): MatchScoreBreakdown {
  // ── 지역 매칭 (40pt) ──────────────────────────────────
  let regionScore = 0;
  let matchMode: MatchMode = "전체";

  const reqRegion = addressToRegion(request.address ?? "");
  if (reqRegion) {
    const leaderRegions = (leader.availableRegions ?? [])
      .map((r) => addressToRegion(r) ?? r);
    if (leaderRegions.includes(reqRegion)) {
      regionScore = 40;
      matchMode = "정확";
    } else if (leaderRegions.some((lr) => ADJACENT[reqRegion]?.includes(lr))) {
      regionScore = 20;
      matchMode = "인접";
    }
  }

  // ── 분야 매칭 (40pt) ──────────────────────────────────
  const catWords = request.category
    .split(/[\s,·]+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
  const hasSpecialtyMatch = leader.specialties.some((s) =>
    catWords.some(
      (w) => s.toLowerCase().includes(w) || w.includes(s.toLowerCase())
    )
  );
  const specialtyScore = hasSpecialtyMatch ? 40 : 0;

  // ── 시간 매칭 (20pt) ──────────────────────────────────
  let timeScore = 0;
  if (request.startDate && leader.availableTimes?.weekdays?.length) {
    const dayIdx = new Date(request.startDate).getDay();
    if (leader.availableTimes.weekdays.includes(DAY_KEY[dayIdx])) {
      timeScore = 20;
    }
  }

  const baseScore = regionScore + specialtyScore + timeScore;

  // ── 보너스 ────────────────────────────────────────────
  let bonusScore = 0;
  const bonuses: string[] = [];

  if (leader.ratingAvg >= 4.9) {
    bonusScore += 10;
    bonuses.push("최우수 평점 +10");
  } else if (leader.ratingAvg >= 4.5) {
    bonusScore += 5;
    bonuses.push("우수 평점 +5");
  }

  if (leader.totalLectures < 5) {
    bonusScore += 20;
    bonuses.push("신규 강사 +20");
  }

  // ── 패널티 ────────────────────────────────────────────
  let penaltyScore = 0;
  const penalties: string[] = [];

  if (leader.maxClassesMonth > 0) {
    const load = leader.currentMonthLectures / leader.maxClassesMonth;
    if (load >= 0.8) {
      penaltyScore += 15;
      penalties.push("월별 부하 초과 -15");
    }
  }

  if (leader.lastLectureDate) {
    const diff = monthsDiff(new Date(leader.lastLectureDate), new Date());
    if (diff >= 9) {
      penaltyScore += 10;
      penalties.push("9개월 이상 비활동 -10");
    } else if (diff >= 6) {
      penaltyScore += 5;
      penalties.push("6개월 이상 비활동 -5");
    }
  }

  return {
    totalScore: Math.max(0, baseScore + bonusScore - penaltyScore),
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
