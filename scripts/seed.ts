/**
 * 시드 스크립트 — 테스트 계정 생성
 * 실행: npx tsx --env-file=.env scripts/seed.ts
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!url || !serviceKey || url.includes("your-project")) {
  console.error("❌  .env 에 Supabase 자격증명을 설정하세요.");
  process.exit(1);
}

const sb = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const USERS = [
  {
    email: "admin@aitda.kr",
    password: "admin1234",
    name: "관리자",
    role: "admin" as const,
  },
  {
    email: "leader1@aitda.kr",
    password: "lead1234",
    name: "박준호",
    role: "leader" as const,
    leader: {
      specialties: ["생성형AI", "ChatGPT", "데이터분석"],
      available_regions: ["화성시", "수원시"],
      available_times: {
        weekdays: ["mon", "wed", "fri"],
        time_slots: ["14:00-17:00"],
      },
      bio: "화성시 AI 1기 수료, 기업·공공기관 AI 교육 전문",
      cert_level: 2,
      is_verified: true,
      lat: 37.1996,
      lng: 126.8312,
      rating_avg: 4.8,
      total_lectures: 12,
      phone: "010-1234-5678",
    },
  },
  {
    email: "leader2@aitda.kr",
    password: "lead1234",
    name: "이수진",
    role: "leader" as const,
    leader: {
      specialties: ["AI윤리", "코딩교육", "디지털리터러시"],
      available_regions: ["화성시"],
      available_times: {
        weekdays: ["tue", "thu"],
        time_slots: ["10:00-13:00"],
      },
      bio: "초·중·고 AI 교육 전문 강사",
      cert_level: 1,
      is_verified: false,
      lat: 37.2110,
      lng: 126.8687,
      phone: "010-9876-5432",
    },
  },
  {
    email: "client@aitda.kr",
    password: "client1234",
    name: "화성초등학교",
    role: "client" as const,
  },
];

async function seed() {
  console.log("🌱  시드 데이터 생성 시작...\n");

  // 테이블 확인
  const { error: chk } = await sb.from("profiles").select("id").limit(1);
  if (chk) {
    console.error("❌  profiles 테이블 없음. SQL 마이그레이션을 먼저 실행하세요.");
    process.exit(1);
  }

  const { data: existing } = await sb.auth.admin.listUsers();
  const existingMap = new Map(existing?.users?.map((u) => [u.email!, u.id]) ?? []);

  for (const u of USERS) {
    let userId: string;

    if (existingMap.has(u.email)) {
      userId = existingMap.get(u.email)!;
      console.log(`  ↩  ${u.email} — 기존 Auth 계정 재사용`);
    } else {
      const { data, error } = await sb.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
      });
      if (error) { console.error(`  ❌  ${u.email}: ${error.message}`); continue; }
      userId = data.user.id;
      console.log(`  ✅  ${u.email} 생성 (${userId})`);
    }

    // profiles
    const { error: pe } = await sb.from("profiles").upsert({
      id: userId, email: u.email, name: u.name, role: u.role,
    });
    if (pe) console.error(`     profiles 오류: ${pe.message}`);

    // leader_profiles
    if (u.role === "leader" && "leader" in u && u.leader) {
      const l = u.leader;
      const { error: le } = await sb.from("leader_profiles").upsert({
        user_id: userId,
        specialties: l.specialties,
        available_regions: l.available_regions,
        available_times: l.available_times,
        bio: l.bio,
        cert_level: l.cert_level,
        is_verified: l.is_verified,
        lat: l.lat ?? null,
        lng: l.lng ?? null,
        // PostGIS geography: ST_MakePoint(lng, lat)
        ...(l.lat && l.lng
          ? { location: `POINT(${l.lng} ${l.lat})` }
          : {}),
        rating_avg: l.rating_avg ?? 0,
        total_lectures: l.total_lectures ?? 0,
        phone: l.phone,
      });
      if (le) console.error(`     leader_profiles 오류: ${le.message}`);
    }
  }

  console.log("\n🎉  완료!\n");
  console.log("  관리자:  admin@aitda.kr  / admin1234");
  console.log("  강사1:   leader1@aitda.kr / lead1234  (인증됨, 평점 4.8)");
  console.log("  강사2:   leader2@aitda.kr / lead1234  (미인증)");
  console.log("  수요처:  client@aitda.kr  / client1234");
}

seed().catch((e) => { console.error("오류:", e); process.exit(1); });
