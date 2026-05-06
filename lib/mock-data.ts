import type { Course, MatchRequest, ActivityLog } from "@/types/database";

export const MOCK_COURSES: Course[] = [
  {
    id: "c1", stage: 1, title: "생성형 AI 기초와 ChatGPT 실습",
    description: "ChatGPT·Gemini 등 생성형 AI의 원리와 윤리를 이해하고, 일상·업무에서 바로 활용할 수 있는 실습 입문 과정.",
    status: "recruiting", instructor_name: "김민준 박사",
    schedule: "2026.04.26~05.17", duration: "매주 토 10:00~13:00 (4주)",
    capacity: 40, enrolled: 32, location: "AI 혁신센터 본원 4F",
    cert: "화성특례시장 수료증", tags: ["ChatGPT", "AI 윤리", "기초"],
  },
  {
    id: "c2", stage: 1, title: "AI 트렌드와 디지털 시민권",
    description: "2026년 AI 기술 동향 파악 및 디지털 시민으로서의 AI 활용 소양 함양.",
    status: "recruiting", instructor_name: "이서연 교수",
    schedule: "2026.05.10~05.31", duration: "매주 일 14:00~16:00 (4주)",
    capacity: 40, enrolled: 18, location: "동탄 캠퍼스",
    cert: "화성특례시장 수료증", tags: ["AI 트렌드", "디지털 시민권"],
  },
  {
    id: "c3", stage: 2, title: "AI 시민 리더 양성 과정 (심화) — 1기",
    description: "학교·기업·공공기관에서 AI를 직접 가르칠 시민 강사 육성. 역량 평가 통과 시 'AI 시민 리더' 자격 부여.",
    status: "recruiting", instructor_name: "박준호 팀장",
    schedule: "2026.05.09~07.05", duration: "매주 토·일 10:00~13:00 (8주)",
    capacity: 25, enrolled: 22, location: "AI 혁신센터 본원 4F",
    cert: "KAIST 총장 명의 이수증 + AI 시민 리더 자격", tags: ["심화", "KAIST 연계", "강사 양성"],
  },
  {
    id: "c4", stage: 2, title: "AI 교수법 워크숍 — 실전 강의 설계",
    description: "모의 강의와 피드백으로 강사 역량을 완성하는 실전 워크숍.",
    status: "upcoming", instructor_name: "최유진 대표",
    schedule: "2026.06.14~07.05", duration: "매주 토 13:00~17:00 (4주)",
    capacity: 20, enrolled: 10, location: "AI 혁신센터 본원 4F",
    cert: "화성특례시장 수료증", tags: ["교수법", "강의 설계"],
  },
  {
    id: "c5", stage: 3, title: "기업 맞춤형 업무 자동화 AI 교육",
    description: "반복 업무 자동화·문서 요약·데이터 분석 등 실무 AI 적용 방법 교육.",
    status: "ongoing", instructor_name: "정해원 연구원",
    schedule: "2026.05.20~06.10", duration: "매주 화·목 18:30~20:30",
    capacity: 30, enrolled: 28, location: "동탄 캠퍼스",
    cert: "화성특례시장 수료증", tags: ["업무 자동화", "기업 교육"],
  },
  {
    id: "c6", stage: 3, title: "스마트 제조·물류 AI 데이터 분석",
    description: "화성시 제조·물류 기업 대상 AI 데이터 분석 심화 과정.",
    status: "upcoming", instructor_name: "한소희 교수",
    schedule: "2026.07.05~07.26", duration: "매주 토 09:00~13:00",
    capacity: 25, enrolled: 3, location: "동탄 캠퍼스",
    cert: "화성특례시장 수료증", tags: ["제조", "물류", "데이터 분석"],
  },
];

export const MOCK_MATCH_REQUESTS: MatchRequest[] = [
  {
    id: "m1", requester_name: "김현수", requester_org: "화성시 동탄초등학교",
    theme: "어린이 AI 기초 교육", preferred_date: "2026-06-14",
    audience_size: 25, location: "동탄초 교실", status: "pending",
    created_at: "2026-05-01T09:00:00Z", requester_id: "u5",
  },
  {
    id: "m2", requester_name: "박지영", requester_org: "화성시 노인복지관",
    theme: "시니어 스마트폰 AI 활용", preferred_date: "2026-06-21",
    audience_size: 30, location: "복지관 강당", status: "pending",
    created_at: "2026-05-02T10:30:00Z", requester_id: "u6",
  },
  {
    id: "m3", requester_name: "이동현", requester_org: "(주)화성테크",
    theme: "업무 자동화 AI 실습", preferred_date: "2026-06-07",
    audience_size: 15, location: "회사 회의실", status: "matched",
    instructor_name: "박준호", created_at: "2026-04-28T14:00:00Z", requester_id: "u7",
  },
  {
    id: "m4", requester_name: "최선희", requester_org: "화성시청 행정지원과",
    theme: "공공행정 AI 도구 활용", preferred_date: "2026-05-31",
    audience_size: 20, location: "시청 교육실 2층", status: "completed",
    instructor_name: "이서연", created_at: "2026-04-20T11:00:00Z", requester_id: "u8",
  },
];

export const MOCK_ACTIVITY_LOGS: ActivityLog[] = [
  { id: "a1", instructor_id: "inst1", title: "ChatGPT 기초 실습", date: "2026-03-15", audience_count: 28, location: "동탄 캠퍼스", rating: 4.8 },
  { id: "a2", instructor_id: "inst1", title: "AI 윤리 토론", date: "2026-04-02", audience_count: 22, location: "AI 혁신센터 본원", rating: 4.9 },
  { id: "a3", instructor_id: "inst1", title: "시니어 AI 활용", date: "2026-04-20", audience_count: 35, location: "노인복지관", rating: 4.7 },
  { id: "a4", instructor_id: "inst1", title: "초등 코딩+AI", date: "2026-05-03", audience_count: 30, location: "동탄초등학교", rating: 5.0 },
  { id: "a5", instructor_id: "inst1", title: "기업 업무자동화", date: "2026-05-17", audience_count: 18, location: "(주)화성테크", rating: 4.6 },
];

export const MONTHLY_STATS = [
  { month: "1월", sessions: 2, learners: 42 },
  { month: "2월", sessions: 3, learners: 68 },
  { month: "3월", sessions: 5, learners: 110 },
  { month: "4월", sessions: 7, learners: 163 },
  { month: "5월", sessions: 9, learners: 198 },
  { month: "6월", sessions: 12, learners: 247 },
];

export const CATEGORY_STATS = [
  { name: "AI 기초", value: 38 },
  { name: "시민 리더", value: 28 },
  { name: "기업 맞춤형", value: 22 },
  { name: "시니어·복지", value: 12 },
];
