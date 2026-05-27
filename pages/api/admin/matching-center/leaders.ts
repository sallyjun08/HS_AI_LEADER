import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAuth, type TokenPayload } from "@/lib/auth";

// GET /api/admin/matching-center/leaders
// 매칭 센터용 인증 강사 전체 목록 (is_verified=true)
// available_times + 이달 강의 수 + 최근 강의일 포함

async function handler(req: NextApiRequest, res: NextApiResponse, _user: TokenPayload) {
  if (req.method !== "GET") return res.status(405).end();

  const now = new Date();
  const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  const [{ data, error }, { data: monthlyRows }, { data: lastRows }] = await Promise.all([
    supabaseAdmin
      .from("leader_profiles")
      .select(`
        id, is_verified, is_active,
        specialties, available_regions, available_times,
        bio, rating_avg, total_lectures, response_rate, max_classes_month, cert_level,
        profiles!leader_profiles_user_id_fkey(name, email)
      `)
      .eq("is_verified", true)
      .order("rating_avg", { ascending: false })
      .order("total_lectures", { ascending: false }),

    // 이달 강의 수 집계
    supabaseAdmin
      .from("activity_reports")
      .select("instructor_id")
      .gte("lecture_date", thisMonthStart),

    // 강사별 최근 강의일
    supabaseAdmin
      .from("activity_reports")
      .select("instructor_id, lecture_date")
      .order("lecture_date", { ascending: false }),
  ]);

  if (error) return res.status(500).json({ error: error.message });

  // 이달 강의 수 맵
  const monthlyCount: Record<string, number> = {};
  for (const r of monthlyRows ?? []) {
    monthlyCount[r.instructor_id] = (monthlyCount[r.instructor_id] ?? 0) + 1;
  }

  // 최근 강의일 맵 (이미 내림차순이므로 첫 번째 값이 최신)
  const lastLectureDate: Record<string, string> = {};
  for (const r of lastRows ?? []) {
    if (!lastLectureDate[r.instructor_id]) {
      lastLectureDate[r.instructor_id] = r.lecture_date;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []).map((l: any) => ({
    id:                   l.id,
    name:                 l.profiles?.name ?? "—",
    email:                l.profiles?.email ?? "",
    isVerified:           l.is_verified,
    isActive:             l.is_active ?? true,
    specialties:          Array.isArray(l.specialties)        ? l.specialties        : [],
    availableRegions:     Array.isArray(l.available_regions)  ? l.available_regions  : [],
    availableTimes:       l.available_times ?? null,
    bio:                  l.bio ?? null,
    ratingAvg:            Number(l.rating_avg)       || 0,
    totalLectures:        Number(l.total_lectures)   || 0,
    responseRate:         Number(l.response_rate)    || 1,
    maxClassesMonth:      Number(l.max_classes_month) || 10,
    currentMonthLectures: monthlyCount[l.id]         ?? 0,
    lastLectureDate:      lastLectureDate[l.id]      ?? null,
    certLevel:            l.cert_level               ?? null,
  }));

  return res.status(200).json(rows);
}

export default requireAuth(handler, ["admin"]);
