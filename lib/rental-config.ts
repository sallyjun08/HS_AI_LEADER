// ============================================================
// 화성人 AI 잇다(IT-DA) — 공간·장비 대여 설정
//
// ⚠️  비용(fee_note)과 운영 여부(available)는 확정 전 임시값입니다.
//     확정되면 이 파일만 수정하면 전체 UI에 자동 반영됩니다.
// ============================================================

export type RentalVenue = {
  id: string;
  name: string;
  address: string;
  capacity: number;    // 최대 수용 인원
  features: string[];  // 제공 시설
  fee_note: string;    // 대여 비용 ("미정" or "시간당 XX,000원" 등)
  available: boolean;
};

export type RentalEquipment = {
  id: string;
  name: string;
  max_quantity: number;
  fee_note: string;
  available: boolean;
};

// ----------------------------------------------------------
// 대여 가능 공간 목록 (임시 데이터 — fee_note 확정 후 수정)
// ----------------------------------------------------------
export const RENTAL_VENUES: RentalVenue[] = [
  {
    id: "hwaseong-city-hall-main",
    name: "화성시청 대회의실",
    address: "경기도 화성시 남양읍 시청로 159",
    capacity: 80,
    features: ["빔프로젝터", "마이크·음향", "화이트보드", "냉난방"],
    fee_note: "미정",
    available: true,
  },
  {
    id: "dongtan-culture-a",
    name: "동탄복합문화센터 교육실 A",
    address: "경기도 화성시 동탄면로 164",
    capacity: 30,
    features: ["빔프로젝터", "화이트보드", "냉난방", "무선 인터넷"],
    fee_note: "미정",
    available: true,
  },
  {
    id: "dongtan-culture-b",
    name: "동탄복합문화센터 교육실 B",
    address: "경기도 화성시 동탄면로 164",
    capacity: 20,
    features: ["빔프로젝터", "화이트보드", "냉난방"],
    fee_note: "미정",
    available: true,
  },
  {
    id: "hwaseong-library-seminar",
    name: "화성시립도서관 세미나실",
    address: "경기도 화성시 봉담읍 와우리로 45",
    capacity: 25,
    features: ["빔프로젝터", "화이트보드", "냉난방", "무선 인터넷"],
    fee_note: "미정",
    available: true,
  },
  {
    id: "bongdam-community",
    name: "봉담읍 주민자치센터 다목적실",
    address: "경기도 화성시 봉담읍 봉담로 11",
    capacity: 40,
    features: ["빔프로젝터", "마이크", "냉난방"],
    fee_note: "미정",
    available: true,
  },
  {
    id: "namyang-community",
    name: "남양읍 주민자치센터 강의실",
    address: "경기도 화성시 남양읍 남양로 310",
    capacity: 25,
    features: ["화이트보드", "냉난방"],
    fee_note: "미정",
    available: false, // 리모델링 중 (임시)
  },
];

// ----------------------------------------------------------
// 대여 가능 장비 목록 (임시 데이터 — fee_note 확정 후 수정)
// ----------------------------------------------------------
export const RENTAL_EQUIPMENT: RentalEquipment[] = [
  {
    id: "laptop",
    name: "노트북",
    max_quantity: 30,
    fee_note: "미정",
    available: true,
  },
  {
    id: "tablet",
    name: "태블릿 PC",
    max_quantity: 20,
    fee_note: "미정",
    available: false, // 추후 도입 예정
  },
];
