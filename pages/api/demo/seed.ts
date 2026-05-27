/**
 * POST /api/demo/seed?key=hwaseong-demo-2026   — 샘플 데이터 생성
 * DELETE /api/demo/seed?key=hwaseong-demo-2026  — 샘플 데이터 삭제
 *
 * 개발자 도구 콘솔에서:
 *   const K = 'hwaseong-demo-2026';
 *   // 생성
 *   fetch(`/api/demo/seed?key=${K}`, { method: 'POST' }).then(r=>r.json()).then(console.log)
 *   // 삭제
 *   fetch(`/api/demo/seed?key=${K}`, { method: 'DELETE' }).then(r=>r.json()).then(console.log)
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";

const SEED_EMAIL_SUFFIX = "@seedtest.aitda";

const LEADERS = [
  {
    email: "leader1" + SEED_EMAIL_SUFFIX,
    name: "김동탄",
    phone: "010-1234-5001",
    specialties: ["생성형 AI", "ChatGPT 활용", "AI 리터러시"],
    preferredAudiences: ["시니어(노인)", "성인", "학부모"],
    availableRegions: ["동탄"],
    availableTimes: { weekdays: ["mon","tue","wed","thu","fri"], time_slots: ["morning","afternoon"] },
    bio: "동탄 지역 생성형 AI·ChatGPT 활용 교육 전문 강사",
    ratingAvg: 4.9,
    totalLectures: 15,
    maxClassesMonth: 10,
  },
  {
    email: "leader2" + SEED_EMAIL_SUFFIX,
    name: "이향남",
    phone: "010-1234-5002",
    specialties: ["AI 리터러시", "미디어 리터러시", "스마트폰 AI"],
    preferredAudiences: ["성인", "학부모"],
    availableRegions: ["향남"],
    availableTimes: { weekdays: ["wed","thu","fri"], time_slots: ["afternoon"] },
    bio: "향남 지역 AI 리터러시·스마트폰 AI 활용 교육 강사",
    ratingAvg: 4.0,
    totalLectures: 3,
    maxClassesMonth: 10,
  },
  {
    email: "leader3" + SEED_EMAIL_SUFFIX,
    name: "박봉담",
    phone: "010-1234-5003",
    specialties: ["업무 자동화", "엑셀·자동화", "노코드 도구"],
    preferredAudiences: ["성인"],
    availableRegions: ["봉담"],
    availableTimes: { weekdays: ["mon","tue","wed"], time_slots: ["morning","afternoon"] },
    bio: "기업·직장인 대상 AI 업무 자동화 교육 전문",
    ratingAvg: 4.2,
    totalLectures: 12,
    maxClassesMonth: 8,
  },
  {
    email: "leader4" + SEED_EMAIL_SUFFIX,
    name: "최우정",
    phone: "010-1234-5004",
    specialties: ["스마트폰 AI", "시니어 특화", "기초 입문자"],
    preferredAudiences: ["시니어(노인)", "성인"],
    availableRegions: ["우정"],
    availableTimes: { weekdays: ["tue","thu"], time_slots: ["morning"] },
    bio: "어르신·기초 입문자 대상 스마트폰 AI 활용 교육 전문",
    ratingAvg: 4.6,
    totalLectures: 25,
    maxClassesMonth: 8,
  },
  {
    email: "leader5" + SEED_EMAIL_SUFFIX,
    name: "정화성",
    phone: "010-1234-5005",
    specialties: ["AI 윤리", "미디어 리터러시"],
    preferredAudiences: ["성인", "대학생"],
    availableRegions: ["화성시청"],
    availableTimes: { weekdays: ["mon","tue","wed","thu","fri"], time_slots: ["morning","afternoon"] },
    bio: "AI 윤리·미디어 리터러시 전문 강사",
    ratingAvg: 3.5,
    totalLectures: 8,
    maxClassesMonth: 10,
  },
];

const CLIENT = {
  email: "client1" + SEED_EMAIL_SUFFIX,
  name: "화성교육지원청",
};

const PENDING_REQUESTS = [
  {
    title: "동탄2동 AI 기초 교육",
    category: "생성형 AI",
    address: "동탄",
    start_date: "2026-06-01",
    end_date: "2026-06-01",
    lecture_type: "oneday",
    session_count: 1,
    lecture_hours: 3,
    lecture_times: [{ date: "2026-06-01", day: "mon", startTime: "09:00", endTime: "12:00" }],
    notes: "초등학생 대상 생성형 AI 기초 소양 교육",
    institution_type: "초등학교",
    target_audience: ["초등(저학년)", "초등(고학년)"],
    participant_count: 30,
    location_type: "offline",
  },
  {
    title: "향남읍 AI 리터러시 교육 과정",
    category: "AI 리터러시",
    address: "향남",
    start_date: "2026-06-03",
    end_date: "2026-06-05",
    lecture_type: "intensive",
    session_count: 3,
    lecture_hours: 2,
    lecture_times: [
      { date: "2026-06-03", day: "wed", startTime: "14:00", endTime: "16:00" },
      { date: "2026-06-04", day: "thu", startTime: "14:00", endTime: "16:00" },
      { date: "2026-06-05", day: "fri", startTime: "14:00", endTime: "16:00" },
    ],
    notes: "지역 주민 AI 리터러시 및 미디어 활용 능력 함양",
    institution_type: "주민센터",
    target_audience: ["성인", "학부모"],
    participant_count: 20,
    location_type: "offline",
  },
  {
    title: "화성시청 공무원 업무 자동화 AI 교육",
    category: "업무 자동화",
    address: "화성시청",
    start_date: "2026-06-06",
    end_date: "2026-06-27",
    lecture_type: "longterm",
    session_count: 4,
    lecture_hours: 2,
    lecture_times: [
      { date: "2026-06-06", day: "fri", startTime: "10:00", endTime: "12:00" },
      { date: "2026-06-13", day: "fri", startTime: "10:00", endTime: "12:00" },
      { date: "2026-06-20", day: "fri", startTime: "10:00", endTime: "12:00" },
      { date: "2026-06-27", day: "fri", startTime: "10:00", endTime: "12:00" },
    ],
    notes: "공무원 대상 AI 업무 자동화 및 엑셀 활용 교육",
    institution_type: "공공기관",
    target_audience: ["성인"],
    participant_count: 15,
    location_type: "offline",
  },
];

function dayOfWeek(dateStr: string): string {
  return ["sun","mon","tue","wed","thu","fri","sat"][new Date(dateStr).getDay()];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 키 검증
  const key = req.query.key as string;
  if (key !== process.env.DEMO_SEED_KEY) {
    return res.status(401).json({ error: "잘못된 키입니다." });
  }

  // ── DELETE ────────────────────────────────────────────────────────────────
  if (req.method === "DELETE") {
    const { data: seedProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .like("email", "%" + SEED_EMAIL_SUFFIX);

    const seedIds = (seedProfiles ?? []).map((p) => p.id);
    if (seedIds.length === 0) return res.status(200).json({ message: "삭제할 샘플 데이터 없음" });

    await supabaseAdmin.from("match_requests").delete().in("client_id", seedIds);
    for (const id of seedIds) {
      await supabaseAdmin.auth.admin.deleteUser(id);
    }
    return res.status(200).json({ message: `샘플 데이터 ${seedIds.length}명 삭제 완료` });
  }

  // ── POST ──────────────────────────────────────────────────────────────────
  if (req.method !== "POST") return res.status(405).end();

  // 중복 방지
  const { data: existing } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .like("email", "%" + SEED_EMAIL_SUFFIX)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return res.status(409).json({ error: "샘플 데이터가 이미 존재합니다. 먼저 DELETE로 삭제하세요." });
  }

  const now = new Date();
  const daysAgo   = (n: number) => { const d = new Date(now); d.setDate(d.getDate() - n); return d.toISOString().split("T")[0]; };
  const daysAgoTs = (n: number) => { const d = new Date(now); d.setDate(d.getDate() - n); return d.toISOString(); };
  const daysLater = (n: number) => { const d = new Date(now); d.setDate(d.getDate() + n); return d.toISOString().split("T")[0]; };
  const hoursAgo  = (h: number) => new Date(now.getTime() - h * 3600000).toISOString();
  const adminApprovedAt = daysAgoTs(1);

  // ── 1. 강사 계정 생성 ──────────────────────────────────────────────────────
  type LeaderRec = { userId: string; leaderId: string };
  const leaderMap = new Map<string, LeaderRec>();

  for (const ld of LEADERS) {
    const { data: au, error: auErr } = await supabaseAdmin.auth.admin.createUser({
      email: ld.email, password: "Test1234!", email_confirm: true,
      user_metadata: { role: "leader", name: ld.name },
    });
    if (auErr) return res.status(500).json({ error: `강사 생성 실패 (${ld.name}): ${auErr.message}` });

    const userId = au.user.id;
    await supabaseAdmin.from("profiles").upsert(
      { id: userId, name: ld.name, email: ld.email, role: "leader" },
      { onConflict: "id", ignoreDuplicates: true }
    );
    const { data: lp, error: lpErr } = await supabaseAdmin
      .from("leader_profiles")
      .upsert({
        user_id: userId, is_verified: true, is_active: true,
        phone: ld.phone, specialties: ld.specialties,
        preferred_audiences: ld.preferredAudiences,
        available_regions: ld.availableRegions, available_times: ld.availableTimes,
        bio: ld.bio, rating_avg: ld.ratingAvg, total_lectures: ld.totalLectures,
        max_classes_month: ld.maxClassesMonth, response_rate: 0.9,
      }, { onConflict: "user_id" })
      .select("id").single();

    if (lpErr || !lp) return res.status(500).json({ error: `강사 프로필 실패 (${ld.name}): ${lpErr?.message}` });
    leaderMap.set(ld.name, { userId, leaderId: lp.id });
  }

  // ── 2. 수요처 계정 생성 ────────────────────────────────────────────────────
  const { data: ca, error: caErr } = await supabaseAdmin.auth.admin.createUser({
    email: CLIENT.email, password: "Test1234!", email_confirm: true,
    user_metadata: { role: "client", name: CLIENT.name },
  });
  if (caErr) return res.status(500).json({ error: `수요처 생성 실패: ${caErr.message}` });

  const clientUserId = ca.user.id;
  await supabaseAdmin.from("profiles").upsert(
    { id: clientUserId, name: CLIENT.name, email: CLIENT.email, role: "client" },
    { onConflict: "id", ignoreDuplicates: true }
  );

  // ── 3. 매칭 센터 대기 요청 3건 ────────────────────────────────────────────
  await supabaseAdmin.from("match_requests").insert(
    PENDING_REQUESTS.map((r) => ({ ...r, client_id: clientUserId, status: "pending", is_approved: false }))
  );

  // ── 4. 강사 수락 대기 (status: matched) ───────────────────────────────────
  const dongtan  = leaderMap.get("김동탄")!;
  const hyangnam = leaderMap.get("이향남")!;
  const bondam   = leaderMap.get("박봉담")!;
  const woojung  = leaderMap.get("최우정")!;
  const hwaseong = leaderMap.get("정화성")!;

  const m1Date = daysLater(7);
  await supabaseAdmin.from("match_requests").insert({
    client_id: clientUserId, leader_id: dongtan.leaderId,
    title: "동탄1동 어르신 AI 기초 교육 (수락 대기)",
    category: "ChatGPT 활용", address: "동탄",
    start_date: m1Date, end_date: m1Date,
    lecture_type: "oneday", session_count: 1, lecture_hours: 3,
    lecture_times: [{ date: m1Date, day: dayOfWeek(m1Date), startTime: "10:00", endTime: "13:00" }],
    notes: "60세 이상 어르신 대상 스마트폰 AI 활용 교육",
    institution_type: "경로당", target_audience: ["어르신"],
    participant_count: 20, location_type: "offline",
    status: "matched", is_approved: true, matched_at: now.toISOString(),
  });

  const [d0, d1, d2] = [daysLater(10), daysLater(11), daysLater(12)];
  await supabaseAdmin.from("match_requests").insert({
    client_id: clientUserId, leader_id: hyangnam.leaderId,
    title: "향남 주민센터 AI 리터러시 기초 과정 (수락 대기)",
    category: "AI 리터러시", address: "향남",
    start_date: d0, end_date: d2,
    lecture_type: "intensive", session_count: 3, lecture_hours: 2,
    lecture_times: [
      { date: d0, day: dayOfWeek(d0), startTime: "14:00", endTime: "16:00" },
      { date: d1, day: dayOfWeek(d1), startTime: "14:00", endTime: "16:00" },
      { date: d2, day: dayOfWeek(d2), startTime: "14:00", endTime: "16:00" },
    ],
    institution_type: "주민센터", target_audience: ["성인", "학부모"],
    participant_count: 15, location_type: "offline",
    status: "matched", is_approved: true, matched_at: now.toISOString(),
  });

  // ── 5. 진행 중 (박봉담 장기정기형 3/4회차 제출) ───────────────────────────
  const ltDates = Array.from({ length: 4 }, (_, i) => daysAgo(21 - i * 7));
  const { data: ltMr } = await supabaseAdmin.from("match_requests").insert({
    client_id: clientUserId, leader_id: bondam.leaderId,
    title: "봉담 AI 업무 자동화 실무 교육 (장기정기형 진행 중)",
    category: "업무 자동화", address: "봉담",
    start_date: ltDates[0], end_date: ltDates[3],
    lecture_type: "longterm", session_count: 4, lecture_hours: 2,
    lecture_times: ltDates.map((d) => ({ date: d, day: dayOfWeek(d), startTime: "10:00", endTime: "12:00" })),
    institution_type: "기업체", target_audience: ["성인"],
    participant_count: 18, location_type: "offline",
    status: "ongoing", is_approved: true,
  }).select("id").single();

  if (ltMr) {
    for (const [i, text] of [
      [0, "1회차: AI 기초 개념 및 생성형 AI 소개. ChatGPT·Gemini 실습. 참가자 집중도 높았음."],
      [1, "2회차: 프롬프트 엔지니어링 기초. 보고서·이메일 자동화 실습. 만족도 높음."],
      [2, "3회차: AI 데이터 분석 입문. 엑셀 AI 분석 및 차트 자동 생성 실습."],
    ] as [number, string][]) {
      await supabaseAdmin.from("activity_reports").insert({
        match_id: ltMr.id, instructor_id: bondam.leaderId,
        session_index: i, lecture_date: ltDates[i],
        attendance_count: i === 1 ? 17 : 18,
        report_text: text, image_urls: [],
        ...(i < 2 ? { client_approved_at: daysAgoTs(16 - i * 7) } : {}),
      });
    }
  }

  // ── 6. 완료 강의들 ────────────────────────────────────────────────────────

  // 6a. 박봉담 장기정기형 완료 (정산 대기)
  const cltDates = Array.from({ length: 4 }, (_, i) => daysAgo(40 - i * 7));
  const { data: cltMr } = await supabaseAdmin.from("match_requests").insert({
    client_id: clientUserId, leader_id: bondam.leaderId,
    title: "봉담 기업 AI 입문 교육 (완료·정산대기)",
    category: "업무 자동화", address: "봉담",
    start_date: cltDates[0], end_date: cltDates[3],
    lecture_type: "longterm", session_count: 4, lecture_hours: 2,
    lecture_times: cltDates.map((d) => ({ date: d, day: dayOfWeek(d), startTime: "10:00", endTime: "12:00" })),
    target_audience: ["성인"], participant_count: 12,
    location_type: "offline", status: "completed", is_approved: true,
  }).select("id").single();

  if (cltMr) {
    for (let i = 0; i < 3; i++) {
      await supabaseAdmin.from("activity_reports").insert({
        match_id: cltMr.id, instructor_id: bondam.leaderId,
        session_index: i, lecture_date: cltDates[i],
        attendance_count: 12,
        report_text: `${i+1}회차: 업무 자동화 실습 완료.`,
        image_urls: [], client_approved_at: daysAgoTs(35 - i * 7),
      });
    }
    await supabaseAdmin.from("activity_reports").insert({
      match_id: cltMr.id, instructor_id: bondam.leaderId,
      session_index: 3, lecture_date: cltDates[3],
      attendance_count: 12,
      report_text: "4회차(최종): 전체 과정 마무리 및 실무 적용 워크숍. 수강생 전원 프롬프트 설계 발표 완료.",
      image_urls: [],
      rating_from_client: 4.5,
      client_feedback: "업무에 바로 적용 가능한 실용적인 내용이었습니다. 다음 심화 과정도 신청하고 싶습니다.",
      admin_approved_at: adminApprovedAt,
      instructor_fee: 240000,
    });
  }

  // 6b. 김동탄 집중코스 완료 (보고서 반려 후 재제출 → 승인완료)
  const dtDates = [daysAgo(20), daysAgo(16), daysAgo(13), daysAgo(6)];
  const { data: dtMr } = await supabaseAdmin.from("match_requests").insert({
    client_id: clientUserId, leader_id: dongtan.leaderId,
    title: "생성형 AI 리터러시 심화 과정 (김동탄)",
    category: "AI 리터러시", address: "동탄",
    start_date: dtDates[0], end_date: dtDates[3],
    lecture_type: "intensive", session_count: 4, lecture_hours: 2,
    lecture_times: dtDates.map((d) => ({ date: d, day: dayOfWeek(d), startTime: "14:00", endTime: "16:00" })),
    target_audience: ["성인", "대학생"], participant_count: 25,
    location_type: "offline", status: "completed", is_approved: true,
  }).select("id").single();

  if (dtMr) {
    await supabaseAdmin.from("activity_reports").insert({
      match_id: dtMr.id, instructor_id: dongtan.leaderId,
      session_index: 0, lecture_date: dtDates[0], lecture_dates: dtDates,
      attendance_count: 22,
      report_text: "집중코스 4일 과정 전체 완료.\n1일차: AI 리터러시 기초 — ChatGPT·Copilot 비교 체험\n2일차: 정보 팩트체크 실습 — AI 생성 콘텐츠 신뢰성 판별\n3일차: AI 문서 작성 실습 — 보고서·기획안 초안 작성\n4일차: 종합 실습 및 수료",
      image_urls: [],
      rejection_history: [{
        rejected_at: daysAgoTs(9),
        reason: "강의 일자별 세부 내용이 너무 간략합니다. 각 날짜별로 진행한 내용을 구체적으로 작성해 주세요.",
        resubmitted_at: daysAgoTs(8),
      }],
      rating_from_client: 4.8,
      client_feedback: "재작성 후 내용이 훨씬 충실해졌습니다. 수강생들도 매우 만족했습니다.",
      admin_approved_at: adminApprovedAt,
      instructor_fee: 320000,
      instructor_fee_paid_at: adminApprovedAt,
    });
  }

  // 6c. 김동탄 원데이 (수요처 평가 대기)
  const dtPendDate = daysAgo(3);
  const { data: dtPendMr } = await supabaseAdmin.from("match_requests").insert({
    client_id: clientUserId, leader_id: dongtan.leaderId,
    title: "동탄 초등학교 ChatGPT 활용 교육",
    category: "ChatGPT 활용", address: "동탄",
    start_date: dtPendDate, end_date: dtPendDate,
    lecture_type: "oneday", session_count: 1, lecture_hours: 3,
    lecture_times: [{ date: dtPendDate, day: dayOfWeek(dtPendDate), startTime: "09:00", endTime: "12:00" }],
    target_audience: ["초등(고학년)"], participant_count: 30,
    location_type: "offline", status: "completed", is_approved: true,
  }).select("id").single();

  if (dtPendMr) {
    await supabaseAdmin.from("activity_reports").insert({
      match_id: dtPendMr.id, instructor_id: dongtan.leaderId,
      session_index: 0, lecture_date: dtPendDate, attendance_count: 28,
      report_text: "초등학교 ChatGPT 활용 교육 진행.\n- AI 기초 개념 소개 (눈높이 맞춤)\n- ChatGPT 간단 실습 (질문 만들기, 동화 생성)\n- 학생들의 흥미와 집중도 매우 높았음",
      image_urls: [],
    });
  }

  // 6d. 이향남 원데이 (운영자 최종 승인 대기)
  const hnDate = daysAgo(15);
  const { data: hnMr } = await supabaseAdmin.from("match_requests").insert({
    client_id: clientUserId, leader_id: hyangnam.leaderId,
    title: "향남 스마트폰 AI 활용 입문 교육",
    category: "스마트폰 AI", address: "향남",
    start_date: hnDate, end_date: hnDate,
    lecture_type: "oneday", session_count: 1, lecture_hours: 2,
    lecture_times: [{ date: hnDate, day: dayOfWeek(hnDate), startTime: "14:00", endTime: "16:00" }],
    target_audience: ["성인"], participant_count: 15,
    location_type: "offline", status: "completed", is_approved: true,
  }).select("id").single();

  if (hnMr) {
    await supabaseAdmin.from("activity_reports").insert({
      match_id: hnMr.id, instructor_id: hyangnam.leaderId,
      session_index: 0, lecture_date: hnDate, attendance_count: 14,
      report_text: "스마트폰 AI 활용 입문 교육 완료.\n- AI 앱 소개 및 실습 (Naver AI, Kakao AI)\n- 생성형 AI 용어 설명 및 사용 주의사항 안내",
      image_urls: [],
      rating_from_client: 4.2,
      client_feedback: "눈높이 맞춤 설명이 좋았습니다.",
    });
  }

  // 6e. 최우정 원데이 (수요처 반려 중)
  const wjDate = daysAgo(7);
  const { data: wjMr } = await supabaseAdmin.from("match_requests").insert({
    client_id: clientUserId, leader_id: woojung.leaderId,
    title: "우정읍 어르신 스마트폰 AI 활용 교육",
    category: "시니어 특화", address: "우정",
    start_date: wjDate, end_date: wjDate,
    lecture_type: "oneday", session_count: 1, lecture_hours: 2,
    lecture_times: [{ date: wjDate, day: dayOfWeek(wjDate), startTime: "10:00", endTime: "12:00" }],
    target_audience: ["어르신"], participant_count: 20,
    location_type: "offline", status: "completed", is_approved: true,
  }).select("id").single();

  if (wjMr) {
    await supabaseAdmin.from("activity_reports").insert({
      match_id: wjMr.id, instructor_id: woojung.leaderId,
      session_index: 0, lecture_date: wjDate, attendance_count: 15,
      report_text: "어르신 AI 기초 교육을 진행했습니다.",
      image_urls: [],
      client_rejected_at: hoursAgo(12),
      client_rejection_reason: "교육 내용이 너무 간략합니다. 각 활동별 세부 내용과 수강생 반응을 구체적으로 작성해 주세요.",
    });
  }

  // 6f. 정화성 4건 (승인완료 2 + 승인대기 1 + 수요처평가대기 1)
  const hwCases = [
    { daysBack: 40, rating: 3.5, fee: 50000, paid: true,  text: "AI 윤리 기초 교육 완료. 참가자 전원 출석, 그룹 토론 중심 진행." },
    { daysBack: 30, rating: 4.2, fee: 50000, paid: false, text: "미디어 리터러시 교육 완료. SNS 허위정보 판별 실습 진행." },
    { daysBack: 20, rating: 4.0, fee: null,  paid: false, text: "재작성 완료: AI 윤리 사례 중심으로 딥페이크·허위정보 대응 실습.", rejHistory: true },
    { daysBack: 5,  rating: null, fee: null, paid: false, text: "AI 윤리 교육 진행. 참가자들의 이해도 양호, 질의응답 충분히 진행." },
  ];

  for (const c of hwCases) {
    const sd = daysAgo(c.daysBack);
    const { data: hwMr } = await supabaseAdmin.from("match_requests").insert({
      client_id: clientUserId, leader_id: hwaseong.leaderId,
      title: `화성시 AI 윤리 교육 (정화성, ${sd})`,
      category: "AI 윤리", address: "화성시청",
      start_date: sd, end_date: sd,
      lecture_type: "oneday", session_count: 1, lecture_hours: 2,
      lecture_times: [{ date: sd, day: dayOfWeek(sd), startTime: "10:00", endTime: "12:00" }],
      target_audience: ["성인"], participant_count: 20,
      location_type: "offline", status: "completed", is_approved: true,
    }).select("id").single();

    if (!hwMr) continue;
    await supabaseAdmin.from("activity_reports").insert({
      match_id: hwMr.id, instructor_id: hwaseong.leaderId,
      session_index: 0, lecture_date: sd, attendance_count: 20,
      report_text: c.text, image_urls: [],
      ...(c.rating    ? { rating_from_client: c.rating } : {}),
      ...(c.fee       ? { admin_approved_at: adminApprovedAt, instructor_fee: c.fee } : {}),
      ...(c.paid      ? { instructor_fee_paid_at: adminApprovedAt } : {}),
      ...(c.rejHistory ? {
        rejection_history: [{
          rejected_at: daysAgoTs(c.daysBack + 6),
          reason: "보고서 내용이 추상적입니다. 실제 진행한 활동과 수강생 반응을 구체적으로 기술해 주세요.",
          resubmitted_at: daysAgoTs(c.daysBack + 5),
        }],
      } : {}),
    });
  }

  return res.status(200).json({
    message: "✅ 시연용 샘플 데이터 생성 완료",
    accounts: {
      강사: LEADERS.map((l) => ({ 이름: l.name, 이메일: l.email, 비밀번호: "Test1234!" })),
      수요처: { 이름: CLIENT.name, 이메일: CLIENT.email, 비밀번호: "Test1234!" },
      관리자: { 이메일: "별도 Supabase 계정 사용" },
    },
    시연_시나리오: {
      "1_메인페이지": "/",
      "2_수요처_로그인": `client1${SEED_EMAIL_SUFFIX} / Test1234!`,
      "3_관리자_매칭": "/admin/matching-center (매칭 대기 3건)",
      "4_강사_수락": `leader1${SEED_EMAIL_SUFFIX} / Test1234! → /dashboard/leader/matches`,
      "5_보고서_제출": "/dashboard/leader/reports",
      "6_운영자_검수_정산": "/admin/review → /admin/settlement",
    },
  });
}
