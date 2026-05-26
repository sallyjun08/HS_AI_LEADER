import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAuth, type TokenPayload } from "@/lib/auth";

// POST /api/admin/seed-data   — 개발자 도구 샘플 데이터 생성
// DELETE /api/admin/seed-data — 샘플 데이터 삭제

const SEED_EMAIL_SUFFIX = "@seedtest.aitda";

const LEADERS = [
  {
    email:              "leader1" + SEED_EMAIL_SUFFIX,
    name:               "김동탄",
    phone:              "010-1234-5001",
    specialties:        ["생성형 AI", "ChatGPT 활용", "AI 리터러시"],
    preferredAudiences: ["시니어(노인)", "성인", "학부모"],
    availableRegions:   ["동탄"],
    availableTimes:     { weekdays: ["mon","tue","wed","thu","fri"], time_slots: ["morning","afternoon"] },
    bio:                "동탄 지역 생성형 AI·ChatGPT 활용 교육 전문 강사",
    ratingAvg:          4.9,
    totalLectures:      15,
    maxClassesMonth:    10,
  },
  {
    email:              "leader2" + SEED_EMAIL_SUFFIX,
    name:               "이향남",
    phone:              "010-1234-5002",
    specialties:        ["AI 리터러시", "미디어 리터러시", "스마트폰 AI"],
    preferredAudiences: ["성인", "학부모"],
    availableRegions:   ["향남"],
    availableTimes:     { weekdays: ["wed","thu","fri"], time_slots: ["afternoon"] },
    bio:                "향남 지역 AI 리터러시·스마트폰 AI 활용 교육 강사",
    ratingAvg:          4.0,
    totalLectures:      3,
    maxClassesMonth:    10,
  },
  {
    email:              "leader3" + SEED_EMAIL_SUFFIX,
    name:               "박봉담",
    phone:              "010-1234-5003",
    specialties:        ["업무 자동화", "엑셀·자동화", "노코드 도구"],
    preferredAudiences: ["성인"],
    availableRegions:   ["봉담"],
    availableTimes:     { weekdays: ["mon","tue","wed"], time_slots: ["morning","afternoon"] },
    bio:                "기업·직장인 대상 AI 업무 자동화 교육 전문",
    ratingAvg:          4.2,
    totalLectures:      12,
    maxClassesMonth:    8,
  },
  {
    email:              "leader4" + SEED_EMAIL_SUFFIX,
    name:               "최우정",
    phone:              "010-1234-5004",
    specialties:        ["스마트폰 AI", "시니어 특화", "기초 입문자"],
    preferredAudiences: ["시니어(노인)", "성인"],
    availableRegions:   ["우정"],
    availableTimes:     { weekdays: ["tue","thu"], time_slots: ["morning"] },
    bio:                "어르신·기초 입문자 대상 스마트폰 AI 활용 교육 전문",
    ratingAvg:          4.6,
    totalLectures:      25,
    maxClassesMonth:    8,
  },
  {
    email:              "leader5" + SEED_EMAIL_SUFFIX,
    name:               "정화성",
    phone:              "010-1234-5005",
    specialties:        ["AI 윤리", "미디어 리터러시"],
    preferredAudiences: ["성인", "대학생"],
    availableRegions:   ["화성시청"],
    availableTimes:     { weekdays: ["mon","tue","wed","thu","fri"], time_slots: ["morning","afternoon"] },
    bio:                "AI 윤리·미디어 리터러시 교육 (부하 초과 테스트용)",
    ratingAvg:          3.5,
    totalLectures:      8,
    maxClassesMonth:    10,
  },
];

const CLIENT = {
  email: "client1" + SEED_EMAIL_SUFFIX,
  name:  "화성교육지원청",
};

// ─── Admin 매칭 센터 대기 요청 (강사 미배정) ──────────────────────────────────
const PENDING_REQUESTS = [
  {
    title:            "동탄2동 AI 기초 교육",
    category:         "생성형 AI",
    address:          "동탄",
    start_date:       "2026-06-01",
    end_date:         "2026-06-01",
    lecture_type:     "oneday",
    session_count:    1,
    lecture_hours:    3,
    lecture_times:    [{ date: "2026-06-01", day: "mon", startTime: "09:00", endTime: "12:00" }],
    notes:            "초등학생 대상 생성형 AI 기초 소양 교육",
    institution_type: "초등학교",
    target_audience:  ["초등(저학년)", "초등(고학년)"],
    participant_count: 30,
    location_type:    "offline",
  },
  {
    title:            "향남읍 AI 리터러시 교육 과정",
    category:         "AI 리터러시",
    address:          "향남",
    start_date:       "2026-06-03",
    end_date:         "2026-06-05",
    lecture_type:     "intensive",
    session_count:    3,
    lecture_hours:    2,
    lecture_times:    [
      { date: "2026-06-03", day: "wed", startTime: "14:00", endTime: "16:00" },
      { date: "2026-06-04", day: "thu", startTime: "14:00", endTime: "16:00" },
      { date: "2026-06-05", day: "fri", startTime: "14:00", endTime: "16:00" },
    ],
    notes:            "지역 주민 AI 리터러시 및 미디어 활용 능력 함양",
    institution_type: "주민센터",
    target_audience:  ["성인", "학부모"],
    participant_count: 20,
    location_type:    "offline",
  },
  {
    title:            "화성시청 공무원 업무 자동화 AI 교육",
    category:         "업무 자동화",
    address:          "화성시청",
    start_date:       "2026-06-06",
    end_date:         "2026-07-25",
    lecture_type:     "longterm",
    session_count:    8,
    lecture_hours:    2,
    lecture_times:    [
      { date: "2026-06-06", day: "fri", startTime: "10:00", endTime: "12:00" },
      { date: "2026-06-13", day: "fri", startTime: "10:00", endTime: "12:00" },
      { date: "2026-06-20", day: "fri", startTime: "10:00", endTime: "12:00" },
      { date: "2026-06-27", day: "fri", startTime: "10:00", endTime: "12:00" },
      { date: "2026-07-04", day: "fri", startTime: "10:00", endTime: "12:00" },
      { date: "2026-07-11", day: "fri", startTime: "10:00", endTime: "12:00" },
      { date: "2026-07-18", day: "fri", startTime: "10:00", endTime: "12:00" },
      { date: "2026-07-25", day: "fri", startTime: "10:00", endTime: "12:00" },
    ],
    notes:            "공무원 대상 AI 업무 자동화 및 엑셀 활용 교육",
    institution_type: "공공기관",
    target_audience:  ["성인"],
    participant_count: 15,
    location_type:    "offline",
  },
];

async function handler(req: NextApiRequest, res: NextApiResponse, _user: TokenPayload) {

  // ── DELETE ──────────────────────────────────────────────────────────────────
  if (req.method === "DELETE") {
    const { data: seedProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .like("email", "%" + SEED_EMAIL_SUFFIX);

    const seedIds = (seedProfiles ?? []).map((p) => p.id);
    if (seedIds.length === 0) return res.status(200).json({ message: "삭제할 샘플 데이터 없음" });

    await supabaseAdmin.from("match_requests").delete().in("client_id", seedIds);

    for (const id of seedIds) {
      await supabaseAdmin.auth.admin.deleteUser(id);
    }

    return res.status(200).json({ message: `샘플 데이터 ${seedIds.length}명 삭제 완료` });
  }

  // ── POST ────────────────────────────────────────────────────────────────────
  if (req.method !== "POST") return res.status(405).end();

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

  // 타임스탬프 헬퍼
  function hoursAgo(h: number): string {
    return new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();
  }
  function daysAgo(n: number): string {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    return d.toISOString().split("T")[0];
  }
  function daysAgoTs(n: number): string {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    return d.toISOString();
  }
  function daysLater(n: number): string {
    const d = new Date(now);
    d.setDate(d.getDate() + n);
    return d.toISOString().split("T")[0];
  }
  function dayOfWeek(dateStr: string): string {
    return ["sun","mon","tue","wed","thu","fri","sat"][new Date(dateStr).getDay()];
  }

  const adminApprovedAt = daysAgoTs(1);   // 어제 운영자 승인
  const created: string[] = [];

  // ── 1. 강사 계정 생성 ─────────────────────────────────────────────────────
  type LeaderRec = { userId: string; leaderId: string; meta: typeof LEADERS[0] };
  const leaderMap = new Map<string, LeaderRec>();

  for (const ld of LEADERS) {
    const { data: au, error: auErr } = await supabaseAdmin.auth.admin.createUser({
      email:         ld.email,
      password:      "Test1234!",
      email_confirm: true,
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
      .upsert(
        {
          user_id:              userId,
          is_verified:          true,
          is_active:            true,
          phone:                ld.phone,
          specialties:          ld.specialties,
          preferred_audiences:  ld.preferredAudiences,
          available_regions:    ld.availableRegions,
          available_times:      ld.availableTimes,
          bio:                  ld.bio,
          rating_avg:           ld.ratingAvg,
          total_lectures:       ld.totalLectures,
          max_classes_month:    ld.maxClassesMonth,
          response_rate:        0.9,
        },
        { onConflict: "user_id" }
      )
      .select("id")
      .single();

    if (lpErr || !lp) return res.status(500).json({ error: `강사 프로필 실패 (${ld.name}): ${lpErr?.message}` });

    leaderMap.set(ld.name, { userId, leaderId: lp.id, meta: ld });
    created.push(ld.name);
  }

  // ── 2. 수요처 계정 생성 ───────────────────────────────────────────────────
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

  // ── 3. 매칭 센터 대기 요청 3건 (강사 미배정) ──────────────────────────────
  const { error: pendingErr } = await supabaseAdmin.from("match_requests").insert(
    PENDING_REQUESTS.map((r) => ({ ...r, client_id: clientUserId, status: "pending", is_approved: false }))
  );
  if (pendingErr) return res.status(500).json({ error: `매칭 요청 생성 실패: ${pendingErr.message}` });

  // ── 4. 강사 수락 대기 (status: matched) ──────────────────────────────────

  // 김동탄: 1주 후 원데이형
  const dongtan = leaderMap.get("김동탄")!;
  const dongtanMatchedDate = daysLater(7);
  const { error: m1Err } = await supabaseAdmin.from("match_requests").insert({
    client_id:        clientUserId,
    leader_id:        dongtan.leaderId,
    title:            "동탄1동 어르신 AI 기초 교육 (수락 대기)",
    category:         "ChatGPT 활용",
    address:          "동탄",
    start_date:       dongtanMatchedDate,
    end_date:         dongtanMatchedDate,
    lecture_type:     "oneday",
    session_count:    1,
    lecture_hours:    3,
    lecture_times:    [{ date: dongtanMatchedDate, day: dayOfWeek(dongtanMatchedDate), startTime: "10:00", endTime: "13:00" }],
    notes:            "60세 이상 어르신 대상 스마트폰 AI 활용 교육",
    institution_type: "경로당",
    target_audience:  ["어르신"],
    participant_count: 20,
    location_type:    "offline",
    status:           "matched",
    is_approved:      true,
    matched_at:       now.toISOString(),
  });
  if (m1Err) return res.status(500).json({ error: `김동탄 matched 요청 실패: ${m1Err.message}` });

  // 이향남: 10일 후 집중코스형 3회
  const hyangnam = leaderMap.get("이향남")!;
  const intensiveD0 = daysLater(10);
  const intensiveD1 = daysLater(11);
  const intensiveD2 = daysLater(12);
  const { error: m2Err } = await supabaseAdmin.from("match_requests").insert({
    client_id:        clientUserId,
    leader_id:        hyangnam.leaderId,
    title:            "향남 주민센터 AI 리터러시 기초 과정 (수락 대기)",
    category:         "AI 리터러시",
    address:          "향남",
    start_date:       intensiveD0,
    end_date:         intensiveD2,
    lecture_type:     "intensive",
    session_count:    3,
    lecture_hours:    2,
    lecture_times:    [
      { date: intensiveD0, day: dayOfWeek(intensiveD0), startTime: "14:00", endTime: "16:00" },
      { date: intensiveD1, day: dayOfWeek(intensiveD1), startTime: "14:00", endTime: "16:00" },
      { date: intensiveD2, day: dayOfWeek(intensiveD2), startTime: "14:00", endTime: "16:00" },
    ],
    notes:            "지역 주민 AI 기초 생활 활용 3일 과정",
    institution_type: "주민센터",
    target_audience:  ["성인", "학부모"],
    participant_count: 15,
    location_type:    "offline",
    status:           "matched",
    is_approved:      true,
    matched_at:       now.toISOString(),
  });
  if (m2Err) return res.status(500).json({ error: `이향남 matched 요청 실패: ${m2Err.message}` });

  // ── 5. 장기정기형 진행 중 — 박봉담 8회 중 3회 제출, 각기 다른 상태 ──────────
  // 보고서 흐름 커버리지:
  //   session 0: 수요처 평가 완료 → 운영자 최종 승인 완료 (강사료 지급완료)
  //   session 1: 수요처 평가 완료 → 운영자 최종 승인 대기 (ready)
  //   session 2: 보고서 제출됨   → 수요처 평가 대기 (client_pending)
  const bondam = leaderMap.get("박봉담")!;

  const longtermSessions = Array.from({ length: 8 }, (_, i) => {
    const date = daysAgo(21 - i * 7);
    return { date, day: dayOfWeek(date), startTime: "10:00", endTime: "12:00" };
  });

  const { data: longtermMr, error: longtermErr } = await supabaseAdmin
    .from("match_requests")
    .insert({
      client_id:        clientUserId,
      leader_id:        bondam.leaderId,
      title:            "봉담 AI 업무 자동화 실무 교육 (장기정기형 진행 중)",
      category:         "업무 자동화",
      address:          "봉담",
      start_date:       longtermSessions[0].date,
      end_date:         longtermSessions[7].date,
      lecture_type:     "longterm",
      session_count:    8,
      lecture_hours:    2,
      lecture_times:    longtermSessions,
      notes:            "중소기업 직원 대상 AI 업무 활용 8주 과정",
      institution_type: "기업체",
      target_audience:  ["성인"],
      participant_count: 18,
      location_type:    "offline",
      status:           "ongoing",
      is_approved:      true,
    })
    .select("id")
    .single();

  if (longtermErr || !longtermMr) return res.status(500).json({ error: `박봉담 longterm 요청 실패: ${longtermErr?.message}` });

  // session 0: 운영자 승인 완료 (지급완료)
  await supabaseAdmin.from("activity_reports").insert({
    match_id:               longtermMr.id,
    instructor_id:          bondam.leaderId,
    session_index:          0,
    lecture_date:           longtermSessions[0].date,
    attendance_count:       18,
    report_text:            "1회차: AI 기초 개념 및 생성형 AI 소개\n- ChatGPT·Gemini 등 주요 서비스 실습\n- 업무 자동화 가능성 토의\n- 참가자 대부분 처음 접하는 내용이었으나 집중도 높았음",
    image_urls:             [],
    rating_from_client:     4.5,
    client_feedback:        "기대 이상으로 유익했습니다.",
    admin_approved_at:      adminApprovedAt,
    instructor_fee:         70000,
    instructor_fee_paid_at: adminApprovedAt,
  });

  // session 1: 운영자 최종 승인 대기 (ready)
  await supabaseAdmin.from("activity_reports").insert({
    match_id:           longtermMr.id,
    instructor_id:      bondam.leaderId,
    session_index:      1,
    lecture_date:       longtermSessions[1].date,
    attendance_count:   17,
    report_text:        "2회차: 프롬프트 엔지니어링 기초\n- 효과적인 프롬프트 작성법 실습\n- 보고서·이메일 초안 자동화 실습\n- 참가자 만족도 높음, 업무 적용 사례 다수 공유됨",
    image_urls:         [],
    rating_from_client: 4.2,
    client_feedback:    "실무 적용 방법을 자세히 알려주셔서 좋았습니다.",
  });

  // session 2: 수요처 평가 대기 (client_pending)
  await supabaseAdmin.from("activity_reports").insert({
    match_id:         longtermMr.id,
    instructor_id:    bondam.leaderId,
    session_index:    2,
    lecture_date:     longtermSessions[2].date,
    attendance_count: 18,
    report_text:      "3회차: AI를 활용한 데이터 분석 입문\n- 엑셀 데이터 AI 분석 실습\n- 차트 자동 생성 및 해석 실습\n- 일부 참가자 엑셀 기초 부족으로 추가 설명 진행",
    image_urls:       [],
    // rating_from_client: null → 수요처 평가 대기
  });

  // ── 6. 완료 강의 — 보고서 흐름 4가지 상태 전부 커버 ──────────────────────

  // ─ 6a. 김동탄 intensive 4일 ─────────────────────────────────────────────
  // 상태: 운영자 승인 완료 | 반려이력 1회 있음 | 강사료 지급완료
  const dongtanIntD = [daysAgo(20), daysAgo(16), daysAgo(13), daysAgo(6)];
  const { data: dongtanMr } = await supabaseAdmin
    .from("match_requests")
    .insert({
      client_id:        clientUserId,
      leader_id:        dongtan.leaderId,
      title:            "생성형 AI 리터러시 심화 과정 (김동탄)",
      category:         "AI 리터러시",
      address:          "동탄",
      start_date:       dongtanIntD[0],
      end_date:         dongtanIntD[3],
      lecture_type:     "intensive",
      session_count:    4,
      lecture_hours:    2,
      lecture_times:    dongtanIntD.map((d) => ({ date: d, day: dayOfWeek(d), startTime: "14:00", endTime: "16:00" })),
      target_audience:  ["성인", "대학생"],
      participant_count: 25,
      location_type:    "offline",
      status:           "completed",
      is_approved:      true,
    })
    .select("id")
    .single();

  if (dongtanMr) {
    await supabaseAdmin.from("activity_reports").insert({
      match_id:               dongtanMr.id,
      instructor_id:          dongtan.leaderId,
      session_index:          0,
      lecture_date:           dongtanIntD[0],
      lecture_dates:          dongtanIntD,
      attendance_count:       22,
      report_text:            "집중코스 4일 과정 전체 완료\n\n"
        + "1일차: AI 리터러시 기초 개념 소개 — 생성형 AI 도구 비교 체험(ChatGPT·Copilot), 디지털 리터러시 자가진단\n"
        + "2일차: 정보 검색 및 팩트체크 실습 — AI 생성 콘텐츠 신뢰성 판별, 허위 정보 식별 훈련\n"
        + "3일차: AI 활용 문서 작성 실습 — 보고서·기획안 초안 작성, 프롬프트 직접 설계\n"
        + "4일차: 종합 실습 및 수료 — 포트폴리오 발표, 전체 과정 만족도 매우 높음",
      image_urls:             [],
      // 반려이력: 1회차 반려 후 재작성 완료
      rejection_history:      [
        {
          rejected_at:    daysAgoTs(9),
          reason:         "강의 일자별 세부 내용이 너무 간략합니다. 각 날짜별로 진행한 내용을 구체적으로 작성해 주세요.",
          resubmitted_at: daysAgoTs(8),
        },
      ],
      rating_from_client:     4.8,
      client_feedback:        "재작성 후 내용이 훨씬 충실해졌습니다. 수강생들도 매우 만족했습니다.",
      admin_approved_at:      adminApprovedAt,
      instructor_fee:         320000,
      instructor_fee_paid_at: adminApprovedAt,
    });
  }

  // ─ 6b. 김동탄 oneday ─────────────────────────────────────────────────────
  // 상태: 수요처 평가 대기 (client_pending)
  // → 강사 대시보드: 완료됨 (보고서 제출됨, 미반려)
  // → 수요처 대시보드: 평가 필요
  // → 운영자: 수요처 평가 대기 (승인 버튼 비활성)
  const dongtanPendingDate = daysAgo(3);
  const { data: dongtanPendingMr } = await supabaseAdmin
    .from("match_requests")
    .insert({
      client_id:        clientUserId,
      leader_id:        dongtan.leaderId,
      title:            "동탄 초등학교 ChatGPT 활용 교육",
      category:         "ChatGPT 활용",
      address:          "동탄",
      start_date:       dongtanPendingDate,
      end_date:         dongtanPendingDate,
      lecture_type:     "oneday",
      session_count:    1,
      lecture_hours:    3,
      lecture_times:    [{ date: dongtanPendingDate, day: dayOfWeek(dongtanPendingDate), startTime: "09:00", endTime: "12:00" }],
      target_audience:  ["초등(고학년)"],
      participant_count: 30,
      location_type:    "offline",
      status:           "completed",
      is_approved:      true,
    })
    .select("id")
    .single();

  if (dongtanPendingMr) {
    await supabaseAdmin.from("activity_reports").insert({
      match_id:         dongtanPendingMr.id,
      instructor_id:    dongtan.leaderId,
      session_index:    0,
      lecture_date:     dongtanPendingDate,
      attendance_count: 28,
      report_text:      "초등학교 ChatGPT 활용 교육 진행.\n- AI 기초 개념 소개 (적령기 눈높이 맞춤)\n- ChatGPT 간단 실습 (질문 만들기, 동화 생성)\n- 학생들의 흥미와 집중도가 매우 높았음",
      image_urls:       [],
      // rating_from_client: null → 수요처 평가 대기
    });
  }

  // ─ 6c. 이향남 oneday ─────────────────────────────────────────────────────
  // 상태: 수요처 평가 완료 → 운영자 최종 승인 대기 (ready)
  // → 운영자: 승인 버튼 활성
  const hyangnamDate = daysAgo(15);
  const { data: hyangnamMr } = await supabaseAdmin
    .from("match_requests")
    .insert({
      client_id:        clientUserId,
      leader_id:        hyangnam.leaderId,
      title:            "향남 스마트폰 AI 활용 입문 교육 (이향남)",
      category:         "스마트폰 AI",
      address:          "향남",
      start_date:       hyangnamDate,
      end_date:         hyangnamDate,
      lecture_type:     "oneday",
      session_count:    1,
      lecture_hours:    2,
      lecture_times:    [{ date: hyangnamDate, day: dayOfWeek(hyangnamDate), startTime: "14:00", endTime: "16:00" }],
      target_audience:  ["성인"],
      participant_count: 15,
      location_type:    "offline",
      status:           "completed",
      is_approved:      true,
    })
    .select("id")
    .single();

  if (hyangnamMr) {
    await supabaseAdmin.from("activity_reports").insert({
      match_id:           hyangnamMr.id,
      instructor_id:      hyangnam.leaderId,
      session_index:      0,
      lecture_date:       hyangnamDate,
      attendance_count:   14,
      report_text:        "스마트폰 AI 활용 입문 교육 완료.\n- 기본 AI 앱 소개 및 실습 (Naver AI, Kakao AI)\n- 시민들의 참여가 적극적이었음\n- 생성형 AI 용어 설명 및 사용 주의사항 안내",
      image_urls:         [],
      rating_from_client: 4.2,
      client_feedback:    "눈높이 맞춤 설명이 좋았습니다.",
      // admin_approved_at: null → 운영자 최종 승인 대기
    });
  }

  // ─ 6d. 최우정 oneday ─────────────────────────────────────────────────────
  // 상태: 수요처 반려 중 (rejected)
  // → 강사 대시보드: 진행 중 (재작성 버튼 표시)
  // → 수요처 대시보드: 반려됨 표시
  // → 운영자: 반려됨 (승인 버튼 비활성, 반려 사유 표시)
  const woojung = leaderMap.get("최우정")!;
  const woojungDate = daysAgo(7);
  const { data: woojungMr } = await supabaseAdmin
    .from("match_requests")
    .insert({
      client_id:        clientUserId,
      leader_id:        woojung.leaderId,
      title:            "우정읍 어르신 스마트폰 AI 활용 교육 (최우정)",
      category:         "시니어 특화",
      address:          "우정",
      start_date:       woojungDate,
      end_date:         woojungDate,
      lecture_type:     "oneday",
      session_count:    1,
      lecture_hours:    2,
      lecture_times:    [{ date: woojungDate, day: dayOfWeek(woojungDate), startTime: "10:00", endTime: "12:00" }],
      target_audience:  ["어르신"],
      participant_count: 20,
      location_type:    "offline",
      status:           "completed",
      is_approved:      true,
    })
    .select("id")
    .single();

  if (woojungMr) {
    await supabaseAdmin.from("activity_reports").insert({
      match_id:                woojungMr.id,
      instructor_id:           woojung.leaderId,
      session_index:           0,
      lecture_date:            woojungDate,
      attendance_count:        15,
      report_text:             "어르신 AI 기초 교육을 진행했습니다.",
      image_urls:              [],
      // 수요처 반려 상태
      client_rejected_at:      hoursAgo(12),
      client_rejection_reason: "교육 내용이 너무 간략합니다. 각 활동별 세부 내용과 수강생 반응을 구체적으로 작성해 주세요.",
    });
  }

  // ─ 6e. 정화성 8건 ─────────────────────────────────────────────────────────
  // 상태 분포:
  //   i=0: 승인완료 (rating + admin_approved_at + 지급완료)
  //   i=1: 승인완료 (rating + admin_approved_at)
  //   i=2: 승인완료 intensive (rating + admin_approved_at + 지급완료)
  //   i=3: 승인완료 (rating + admin_approved_at)
  //   i=4: 최종 승인 대기, 반려이력 1회 있음 (ready + rejection_history)
  //   i=5: 최종 승인 대기 (ready, 반려이력 없음)
  //   i=6: 수요처 반려 중 (rejected)
  //   i=7: 수요처 평가 대기 (client_pending)
  const hwaseong = leaderMap.get("정화성")!;
  for (let i = 0; i < 8; i++) {
    const startDate  = daysAgo(i * 5 + 10);
    const lType: "oneday" | "intensive" = i === 2 ? "intensive" : "oneday";
    const intensiveDates = lType === "intensive"
      ? [startDate, daysAgo(i * 5 + 9), daysAgo(i * 5 + 8)]
      : [];
    const matchEndDate = lType === "intensive" ? intensiveDates[2] : startDate;

    const { data: hwsMr } = await supabaseAdmin
      .from("match_requests")
      .insert({
        client_id:        clientUserId,
        leader_id:        hwaseong.leaderId,
        title:            `완료 교육 ${i + 1} (정화성)`,
        category:         hwaseong.meta.specialties[0],
        address:          hwaseong.meta.availableRegions[0],
        start_date:       startDate,
        end_date:         matchEndDate,
        lecture_type:     lType,
        session_count:    lType === "intensive" ? 3 : 1,
        lecture_hours:    2,
        lecture_times:    lType === "intensive"
          ? intensiveDates.map((d) => ({ date: d, day: dayOfWeek(d), startTime: "10:00", endTime: "12:00" }))
          : [{ date: startDate, day: dayOfWeek(startDate), startTime: "10:00", endTime: "12:00" }],
        target_audience:  ["성인"],
        participant_count: 20,
        location_type:    "offline",
        status:           "completed",
        is_approved:      true,
      })
      .select("id")
      .single();

    if (!hwsMr) continue;

    const baseReport = {
      match_id:      hwsMr.id,
      instructor_id: hwaseong.leaderId,
      session_index: 0,
      lecture_date:  startDate,
      attendance_count: 20,
      image_urls:    [],
    };

    if (i === 0) {
      // 승인완료 + 지급완료
      await supabaseAdmin.from("activity_reports").insert({
        ...baseReport,
        report_text:            "교육 완료. 기초 개념부터 실습까지 순서대로 진행했으며 참가자 전원 출석.",
        rating_from_client:     3.5,
        admin_approved_at:      adminApprovedAt,
        instructor_fee:         50000,
        instructor_fee_paid_at: adminApprovedAt,
      });
    } else if (i === 1) {
      // 승인완료
      await supabaseAdmin.from("activity_reports").insert({
        ...baseReport,
        report_text:        "교육 완료. 참가자들의 질문이 활발하게 이어졌습니다.",
        rating_from_client: 3.8,
        admin_approved_at:  adminApprovedAt,
        instructor_fee:     50000,
      });
    } else if (i === 2) {
      // 승인완료 intensive + 지급완료
      await supabaseAdmin.from("activity_reports").insert({
        ...baseReport,
        lecture_dates:          intensiveDates,
        report_text:            `집중코스 3일 과정 완료.\n1일차(${intensiveDates[0]}): 기초 개념 소개\n2일차(${intensiveDates[1]}): 실습 진행\n3일차(${intensiveDates[2]}): 종합 정리 및 수료`,
        rating_from_client:     4.0,
        admin_approved_at:      adminApprovedAt,
        instructor_fee:         150000,
        instructor_fee_paid_at: adminApprovedAt,
      });
    } else if (i === 3) {
      // 승인완료
      await supabaseAdmin.from("activity_reports").insert({
        ...baseReport,
        report_text:        "교육 완료. 참가자 전원 출석, 실습 위주 진행으로 만족도 높았음.",
        rating_from_client: 4.2,
        admin_approved_at:  adminApprovedAt,
        instructor_fee:     50000,
      });
    } else if (i === 4) {
      // 최종 승인 대기 + 반려이력 1회
      await supabaseAdmin.from("activity_reports").insert({
        ...baseReport,
        report_text:        "재작성 완료: 교육 전반에 걸쳐 AI 윤리 사례를 중심으로 진행. 그룹 토론을 통해 딥페이크·허위정보 대응 방법을 실습함. 참가자 만족도 양호.",
        rejection_history:  [
          {
            rejected_at:    daysAgoTs(i * 5 + 6),
            reason:         "보고서 내용이 너무 추상적입니다. 실제 진행한 활동과 수강생 반응을 구체적으로 기술해 주세요.",
            resubmitted_at: daysAgoTs(i * 5 + 5),
          },
        ],
        rating_from_client: 4.0,
        // admin_approved_at: null → 운영자 승인 대기
      });
    } else if (i === 5) {
      // 최종 승인 대기 (반려이력 없음)
      await supabaseAdmin.from("activity_reports").insert({
        ...baseReport,
        report_text:        "미디어 리터러시 기초 교육 완료. SNS 허위정보 판별 실습 진행, 참가자 20명 전원 참여.",
        rating_from_client: 3.8,
        // admin_approved_at: null → 운영자 승인 대기
      });
    } else if (i === 6) {
      // 수요처 반려 중
      await supabaseAdmin.from("activity_reports").insert({
        ...baseReport,
        report_text:             "교육 완료.",
        client_rejected_at:      hoursAgo(3),
        client_rejection_reason: "보고서가 지나치게 간략합니다. 강의 진행 방식, 사용한 교재, 수강생 반응 등을 상세히 기재해 주세요.",
      });
    } else {
      // 수요처 평가 대기 (client_pending)
      await supabaseAdmin.from("activity_reports").insert({
        ...baseReport,
        report_text: "AI 윤리 교육을 진행했습니다. 참가자들의 이해도가 양호했으며 질의응답 시간을 충분히 가졌습니다.",
        // rating_from_client: null → 수요처 평가 대기
      });
    }
  }

  // ── 7. 대여료 정산 샘플 ───────────────────────────────────────────────────

  // 7-1. 동탄 공간 대여 completed (원데이형) — 승인완료
  const rentalDongtanDate = daysAgo(10);
  const { data: rentalDongtanMr } = await supabaseAdmin
    .from("match_requests")
    .insert({
      client_id:              clientUserId,
      leader_id:              dongtan.leaderId,
      title:                  "동탄 생성형 AI 교육 (공간 대여)",
      category:               "생성형 AI",
      address:                "경기도 화성시 동탄면로 164",
      start_date:             rentalDongtanDate,
      end_date:               rentalDongtanDate,
      lecture_type:           "oneday",
      session_count:          1,
      lecture_hours:          3,
      lecture_times:          [{ date: rentalDongtanDate, day: dayOfWeek(rentalDongtanDate), startTime: "09:00", endTime: "12:00" }],
      target_audience:        ["성인"],
      participant_count:      30,
      location_type:          "offline",
      needs_venue:            true,
      rental_venue_id:        "dongtan-culture-a",
      needs_equipment:        false,
      rental_equipment_count: 0,
      rental_notes:           "오전 09:00~12:00 사용 예정",
      rental_fee_total:       0,
      status:                 "completed",
      is_approved:            true,
    })
    .select("id")
    .single();

  if (rentalDongtanMr) {
    await supabaseAdmin.from("activity_reports").insert({
      match_id:           rentalDongtanMr.id,
      instructor_id:      dongtan.leaderId,
      session_index:      0,
      lecture_date:       rentalDongtanDate,
      lecture_dates:      [],
      attendance_count:   28,
      report_text:        "동탄 공간 대여 활용 생성형 AI 기초 교육 완료. 참가자 반응 양호.",
      image_urls:         [],
      rating_from_client: 4.5,
      admin_approved_at:  adminApprovedAt,
      instructor_fee:     90000,
    });
  }

  // 7-2. 화성시청 공간+장비 ongoing (보고서 미제출)
  await supabaseAdmin.from("match_requests").insert({
    client_id:              clientUserId,
    leader_id:              bondam.leaderId,
    title:                  "화성시청 공무원 업무 자동화 실습 (공간+장비)",
    category:               "업무 자동화",
    address:                "경기도 화성시 남양읍 시청로 159",
    start_date:             daysAgo(5),
    end_date:               daysLater(3),
    lecture_type:           "longterm",
    session_count:          4,
    lecture_hours:          2,
    lecture_times:          [daysAgo(5), daysAgo(2), daysLater(1), daysLater(3)].map((d) => ({
      date: d, day: dayOfWeek(d), startTime: "14:00", endTime: "16:00",
    })),
    target_audience:        ["성인"],
    participant_count:      20,
    location_type:          "offline",
    needs_venue:            true,
    rental_venue_id:        "hwaseong-city-hall-main",
    needs_equipment:        true,
    rental_equipment_count: 20,
    rental_notes:           "노트북 20대 + 대회의실 오후 사용",
    rental_fee_total:       0,
    status:                 "ongoing",
    is_approved:            true,
  });

  // 7-3. 봉담 장비 대여 matched (보고서 미제출)
  await supabaseAdmin.from("match_requests").insert({
    client_id:              clientUserId,
    leader_id:              hyangnam.leaderId,
    title:                  "봉담 AI 리터러시 교육 (장비 대여)",
    category:               "AI 리터러시",
    address:                "경기도 화성시 봉담읍 봉담로 11",
    start_date:             daysLater(3),
    end_date:               daysLater(3),
    lecture_type:           "oneday",
    session_count:          1,
    lecture_hours:          2,
    lecture_times:          [{ date: daysLater(3), day: dayOfWeek(daysLater(3)), startTime: "10:00", endTime: "12:00" }],
    target_audience:        ["성인"],
    participant_count:      10,
    location_type:          "offline",
    needs_venue:            false,
    rental_venue_id:        null,
    needs_equipment:        true,
    rental_equipment_count: 10,
    rental_notes:           "노트북 10대 반일 사용",
    rental_fee_total:       30000,
    status:                 "matched",
    is_approved:            true,
    matched_at:             now.toISOString(),
  });

  // 7-4. 도서관 공간 대여 completed (집중코스형) — 승인완료 + 대여료 수납완료
  const rentalLibD = [daysAgo(32), daysAgo(31), daysAgo(30)];
  const { data: rentalLibMr } = await supabaseAdmin
    .from("match_requests")
    .insert({
      client_id:              clientUserId,
      leader_id:              woojung.leaderId,
      title:                  "도서관 시니어 스마트폰 AI 교육 (공간 대여)",
      category:               "시니어 특화",
      address:                "경기도 화성시 봉담읍 와우리로 45",
      start_date:             rentalLibD[0],
      end_date:               rentalLibD[2],
      lecture_type:           "intensive",
      session_count:          3,
      lecture_hours:          2,
      lecture_times:          rentalLibD.map((d) => ({ date: d, day: dayOfWeek(d), startTime: "10:00", endTime: "12:00" })),
      target_audience:        ["어르신"],
      participant_count:      20,
      location_type:          "offline",
      needs_venue:            true,
      rental_venue_id:        "hwaseong-library-seminar",
      needs_equipment:        false,
      rental_equipment_count: 0,
      rental_notes:           null,
      rental_fee_total:       20000,
      rental_fee_paid_at:     adminApprovedAt,
      status:                 "completed",
      is_approved:            true,
    })
    .select("id")
    .single();

  if (rentalLibMr) {
    await supabaseAdmin.from("activity_reports").insert({
      match_id:               rentalLibMr.id,
      instructor_id:          woojung.leaderId,
      session_index:          0,
      lecture_date:           rentalLibD[0],
      lecture_dates:          rentalLibD,
      attendance_count:       18,
      report_text:            `도서관 시니어 스마트폰 AI 3일 과정 완료.\n1일차(${rentalLibD[0]}): 스마트폰 AI 기초 소개\n2일차(${rentalLibD[1]}): 실습 진행\n3일차(${rentalLibD[2]}): 종합 정리`,
      image_urls:             [],
      rating_from_client:     4.0,
      admin_approved_at:      adminApprovedAt,
      instructor_fee:         150000,
      instructor_fee_paid_at: adminApprovedAt,
    });
  }

  return res.status(200).json({
    message: "샘플 데이터 생성 완료",
    created,
    accounts: {
      leaders: LEADERS.map((l) => ({ name: l.name, email: l.email, password: "Test1234!" })),
      client:  { name: CLIENT.name, email: CLIENT.email, password: "Test1234!" },
    },
    report_flow_coverage: {
      "✅ 승인완료":        "김동탄(intensive, 반려이력1회) · 박봉담 1회차 · 정화성 i0-3 · 동탄/도서관 대여",
      "⏳ 최종승인대기":    "이향남 oneday · 박봉담 2회차 · 정화성 i4(반려이력1회) i5",
      "↩ 수요처반려중":    "최우정 oneday · 정화성 i6",
      "🕐 수요처평가대기":  "김동탄 oneday · 박봉담 3회차 · 정화성 i7",
    },
    settlement_summary: {
      instructor_fees_approved: "강사료 정산 탭에 표시되는 건 (admin_approved_at 있는 것만)",
      fee_paid:    "김동탄 집중코스 (320,000) · 박봉담 1회차 (70,000) · 정화성 i0,2 · 도서관 대여 (150,000)",
      fee_unpaid:  "이향남 (60,000) · 정화성 i1,3 · 동탄 대여 (90,000)",
    },
  });
}

export default requireAuth(handler, ["admin"]);
