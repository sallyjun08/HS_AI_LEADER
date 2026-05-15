// 안심 매칭: 매칭 확정 전까지 강사 개인정보 마스킹

export type SafeLeader = {
  id: string;
  maskedName: string;
  certLevel: number;
  isVerified: boolean;
  specialties: string[];
  availableRegions: string[];
  bio: string | null;
  ratingAvg: number;
  totalLectures: number;
  lat: number | null;
  lng: number | null;
  // matched/ongoing 상태일 때만 공개
  realName?: string;
  phone?: string | null;
};

function maskName(name: string): string {
  if (name.length <= 1) return "*";
  if (name.length === 2) return name[0] + "*";
  return name[0] + "*".repeat(name.length - 2) + name[name.length - 1];
}

function maskPhone(phone: string): string {
  return phone.replace(/(\d{3})[- ]?(\d{4})[- ]?(\d{4})/, "$1-****-$3");
}

export function maskLeader(
  leader: {
    id: string;
    certLevel: number;
    isVerified: boolean;
    specialties: string[];
    availableRegions: string[];
    bio: string | null;
    phone: string | null;
    ratingAvg: number;
    totalLectures: number;
    lat: number | null;
    lng: number | null;
    name: string;
  },
  isRevealed: boolean
): SafeLeader {
  const base: SafeLeader = {
    id: leader.id,
    maskedName: maskName(leader.name),
    certLevel: leader.certLevel,
    isVerified: leader.isVerified,
    specialties: leader.specialties ?? [],
    availableRegions: leader.availableRegions ?? [],
    bio: leader.bio,
    ratingAvg: leader.ratingAvg,
    totalLectures: leader.totalLectures,
    lat: leader.lat,
    lng: leader.lng,
  };

  if (isRevealed) {
    base.realName = leader.name;
    base.phone = leader.phone ? maskPhone(leader.phone) : null;
  }

  return base;
}

// 스마트 매칭 점수 계산 (100점 만점)
export function scoreLeaderForRequest(
  leader: {
    availableRegions: string[];
    specialties: string[];
    ratingAvg: number;
    totalLectures: number;
  },
  request: { location: string; category: string }
): number {
  let score = 0;

  // 지역 매칭 (30점)
  if (leader.availableRegions.some(
    (r) => request.location.includes(r) || r.includes(request.location)
  )) {
    score += 30;
  }

  // 분야 매칭 (40점)
  const keywords = request.category.split(/[\s,]+/);
  const matched = leader.specialties.filter((s) =>
    keywords.some((k) => s.includes(k) || k.includes(s))
  );
  score += Math.min(matched.length * 15, 40);

  // 평점 (0~20점)
  score += (leader.ratingAvg / 5) * 20;

  // 경험 보너스 (최대 10점)
  score += Math.min(leader.totalLectures, 10);

  return Math.round(score);
}
