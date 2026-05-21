import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAuth, type TokenPayload } from "@/lib/auth";

// POST /api/admin/seed-data   — 매칭 알고리즘 테스트용 샘플 데이터 생성
// DELETE /api/admin/seed-data — 샘플 데이터 삭제

const SEED_EMAIL_SUFFIX = "@seedtest.aitda";

const LEADERS = [
  {
    email:           "leader1" + SEED_EMAIL_SUFFIX,
    name:            "김동탄",
    specialties:     ["AI 기초 소양", "디지털 리터러시"],
    availableRegions:["동탄"],
    availableTimes:  { weekdays: ["mon","tue","wed","thu","fri"], time_slots: ["오전","오후"] },
    bio:             "동탄 지역 AI 기초 교육 전문 강사",
    ratingAvg:       4.9,
    totalLectures:   15,
    maxClassesMonth: 10,
    // 이달 강의 1건 (부하 10% — 패널티 없음)
    thisMonthLectures: 1,
    lastLectureMonthsAgo: 0,
  },
  {
    email:           "leader2" + SEED_EMAIL_SUFFIX,
    name:            "이향남",
    specialties:     ["AI 시민 리더", "데이터 활용"],
    availableRegions:["향남"],
    availableTimes:  { weekdays: ["wed","thu","fri"], time_slots: ["오후"] },
    bio:             "향남 지역 신규 AI 시민 교육 강사",
    ratingAvg:       4.0,
    totalLectures:   3,     // 신규 강사 보너스 +20
    maxClassesMonth: 10,
    thisMonthLectures: 0,
    lastLectureMonthsAgo: null,
  },
  {
    email:           "leader3" + SEED_EMAIL_SUFFIX,
    name:            "박봉담",
    specialties:     ["AI 기초 소양", "기업 맞춤형"],
    availableRegions:["봉담"],
    availableTimes:  { weekdays: ["mon","tue","wed"], time_slots: ["오전","오후"] },
    bio:             "북부권 기업 AI 교육 전문",
    ratingAvg:       4.2,
    totalLectures:   12,
    maxClassesMonth: 8,
    thisMonthLectures: 0,
    lastLectureMonthsAgo: 2,
  },
  {
    email:           "leader4" + SEED_EMAIL_SUFFIX,
    name:            "최우정",
    specialties:     ["AI 시민 리더", "어르신 교육"],
    availableRegions:["우정"],
    availableTimes:  { weekdays: ["tue","thu"], time_slots: ["오전"] },
    bio:             "남부권 어르신 AI 교육 전문",
    ratingAvg:       4.6,
    totalLectures:   25,
    maxClassesMonth: 8,
    thisMonthLectures: 0,
    lastLectureMonthsAgo: 7, // 6개월 이상 비활동 패널티 -5
  },
  {
    email:           "leader5" + SEED_EMAIL_SUFFIX,
    name:            "정화성",
    specialties:     ["환경 교육", "안전 교육"],
    availableRegions:["화성시청"],
    availableTimes:  { weekdays: ["mon","tue","wed","thu","fri"], time_slots: ["오전","오후"] },
    bio:             "중부권 강사 (AI 비전문, 부하 초과 테스트용)",
    ratingAvg:       3.5,
    totalLectures:   8,
    maxClassesMonth: 10,
    thisMonthLectures: 8, // 80% 부하 초과 → 패널티 -15
    lastLectureMonthsAgo: 0,
  },
];

const CLIENT = {
  email: "client1" + SEED_EMAIL_SUFFIX,
  name:  "화성교육지원청",
};

// 2026-06-01 = Monday, 2026-06-03 = Wednesday, 2026-06-05 = Friday
const PENDING_REQUESTS = [
  {
    title:           "동탄2동 AI 기초 교육",
    category:        "AI 기초 소양",
    address:         "동탄",
    start_date:      "2026-06-01",   // 월요일
    notes:           "초등학생 대상 AI 기초 소양 교육",
    institution_type:"초등학교",
    participant_count: 30,
    frequency:       "single",
    location_type:   "offline",
  },
  {
    title:           "향남읍 AI 시민 리더 과정",
    category:        "AI 시민 리더",
    address:         "향남",
    start_date:      "2026-06-03",   // 수요일
    notes:           "지역 주민 AI 시민 리더십 함양",
    institution_type:"주민센터",
    participant_count: 20,
    frequency:       "regular",
    location_type:   "offline",
  },
  {
    title:           "화성시청 기업 맞춤형 AI 교육",
    category:        "기업 맞춤형",
    address:         "화성시청",
    start_date:      "2026-06-05",   // 금요일
    notes:           "공무원 대상 업무 AI 활용 교육",
    institution_type:"공공기관",
    participant_count: 15,
    frequency:       "single",
    location_type:   "offline",
  },
];

async function handler(req: NextApiRequest, res: NextApiResponse, _user: TokenPayload) {

  // ── DELETE: 샘플 데이터 삭제 ────────────────────────────────────────────
  if (req.method === "DELETE") {
    // auth.users 삭제 → cascade로 profiles, leader_profiles도 삭제됨
    const { data: seedProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .like("email", "%" + SEED_EMAIL_SUFFIX);

    const seedIds = (seedProfiles ?? []).map((p) => p.id);
    if (seedIds.length === 0) return res.status(200).json({ message: "삭제할 샘플 데이터 없음" });

    // match_requests 삭제 (seed 계정의 것)
    await supabaseAdmin
      .from("match_requests")
      .delete()
      .in("client_id", seedIds);

    // auth 사용자 삭제
    for (const id of seedIds) {
      await supabaseAdmin.auth.admin.deleteUser(id);
    }

    return res.status(200).json({ message: `샘플 데이터 ${seedIds.length}명 삭제 완료` });
  }

  // ── POST: 샘플 데이터 생성 ──────────────────────────────────────────────
  if (req.method !== "POST") return res.status(405).end();

  // 중복 체크
  const { data: existing } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .like("email", "%" + SEED_EMAIL_SUFFIX)
    .limit(1)
    .maybeSingle();

  if (existing) {
    return res.status(409).json({ error: "샘플 데이터가 이미 존재합니다. 먼저 DELETE로 삭제하세요." });
  }

  const created: string[] = [];

  // 1. 강사 계정 생성
  const leaderRecords: Array<{ userId: string; leaderId: string; meta: typeof LEADERS[0] }> = [];

  for (const ld of LEADERS) {
    const { data: au, error: auErr } = await supabaseAdmin.auth.admin.createUser({
      email:          ld.email,
      password:       "Test1234!",
      email_confirm:  true,
      user_metadata:  { role: "leader", name: ld.name },
    });
    if (auErr) return res.status(500).json({ error: `강사 생성 실패 (${ld.name}): ${auErr.message}` });

    const userId = au.user.id;

    await supabaseAdmin.from("profiles").upsert(
      { id: userId, name: ld.name, email: ld.email, role: "leader" },
      { onConflict: "id", ignoreDuplicates: true }
    );

    const { data: lp, error: lpErr } = await supabaseAdmin
      .from("leader_profiles")
      .upsert(
        {
          user_id:           userId,
          is_verified:       true,
          is_active:         true,
          specialties:       ld.specialties,
          available_regions: ld.availableRegions,
          available_times:   ld.availableTimes,
          bio:               ld.bio,
          rating_avg:        ld.ratingAvg,
          total_lectures:    ld.totalLectures,
          max_classes_month: ld.maxClassesMonth,
          response_rate:     0.9,
        },
        { onConflict: "user_id" }
      )
      .select("id")
      .single();

    if (lpErr || !lp) return res.status(500).json({ error: `강사 프로필 실패 (${ld.name}): ${lpErr?.message}` });

    leaderRecords.push({ userId, leaderId: lp.id, meta: ld });
    created.push(ld.name);
  }

  // 2. 수요처 계정 생성
  const { data: ca, error: caErr } = await supabaseAdmin.auth.admin.createUser({
    email:         CLIENT.email,
    password:      "Test1234!",
    email_confirm: true,
    user_metadata: { role: "client", name: CLIENT.name },
  });
  if (caErr) return res.status(500).json({ error: `수요처 생성 실패: ${caErr.message}` });

  const clientUserId = ca.user.id;
  await supabaseAdmin.from("profiles").upsert(
    { id: clientUserId, name: CLIENT.name, email: CLIENT.email, role: "client" },
    { onConflict: "id", ignoreDuplicates: true }
  );
  created.push(CLIENT.name);

  // 3. 대기 중인 매칭 요청 3건 생성 (매칭 센터에서 볼 수 있음)
  const { error: mrErr } = await supabaseAdmin.from("match_requests").insert(
    PENDING_REQUESTS.map((r) => ({
      ...r,
      client_id:    clientUserId,
      status:       "pending",
      is_approved:  false,
      target_audience: [],
      lecture_times:   [],
    }))
  );
  if (mrErr) return res.status(500).json({ error: `매칭 요청 생성 실패: ${mrErr.message}` });

  // 4. 활동 보고서 데이터 생성 (패널티/보너스 테스트용 완료 요청)
  const now = new Date();

  for (const rec of leaderRecords) {
    const { meta, leaderId } = rec;
    const lectures = meta.thisMonthLectures ?? 0;
    const monthsAgo = meta.lastLectureMonthsAgo;

    // 이달 강의 (정화성: 8건)
    for (let i = 0; i < lectures; i++) {
      const day = String(i + 1).padStart(2, "0");
      const lectureDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${day}`;
      const { data: mr } = await supabaseAdmin
        .from("match_requests")
        .insert({
          client_id:       clientUserId,
          leader_id:       leaderId,
          title:           `완료 교육 ${i + 1} (${meta.name})`,
          category:        meta.specialties[0],
          address:         meta.availableRegions[0],
          start_date:      lectureDate,
          status:          "completed",
          is_approved:     true,
          participant_count: 20,
          frequency:       "single",
          location_type:   "offline",
          target_audience: [],
          lecture_times:   [],
        })
        .select("id")
        .single();

      if (mr) {
        await supabaseAdmin.from("activity_reports").insert({
          match_id:         mr.id,
          instructor_id:    leaderId,
          lecture_date:     lectureDate,
          attendance_count: 20,
          report_text:      "샘플 강의 보고서",
          image_urls:       [],
        });
      }
    }

    // 과거 강의 (최우정: 7개월 전, 박봉담: 2개월 전, 김동탄: 이달)
    if (typeof monthsAgo === "number" && monthsAgo > 0) {
      const pastDate = new Date(now);
      pastDate.setMonth(pastDate.getMonth() - monthsAgo);
      const pastStr = pastDate.toISOString().split("T")[0];

      const { data: pastMr } = await supabaseAdmin
        .from("match_requests")
        .insert({
          client_id:       clientUserId,
          leader_id:       leaderId,
          title:           `이전 완료 교육 (${meta.name})`,
          category:        meta.specialties[0],
          address:         meta.availableRegions[0],
          start_date:      pastStr,
          status:          "completed",
          is_approved:     true,
          participant_count: 15,
          frequency:       "single",
          location_type:   "offline",
          target_audience: [],
          lecture_times:   [],
        })
        .select("id")
        .single();

      if (pastMr) {
        await supabaseAdmin.from("activity_reports").insert({
          match_id:         pastMr.id,
          instructor_id:    leaderId,
          lecture_date:     pastStr,
          attendance_count: 15,
          report_text:      "샘플 이전 강의 보고서",
          image_urls:       [],
        });
      }
    }
  }

  return res.status(200).json({
    message: "샘플 데이터 생성 완료",
    created,
    accounts: {
      leaders: LEADERS.map((l) => ({ name: l.name, email: l.email, password: "Test1234!" })),
      client:  { name: CLIENT.name, email: CLIENT.email, password: "Test1234!" },
    },
    note: "매칭 센터에서 대기 중인 요청 3건을 확인하세요.",
  });
}

export default requireAuth(handler, ["admin"]);
