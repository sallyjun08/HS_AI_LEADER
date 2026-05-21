import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAuth, type TokenPayload } from "@/lib/auth";

// GET /api/admin/matching-center/leaders
// 매칭 센터용 인증 강사 전체 목록 (is_verified=true)
// available_times 포함, 이름 조인

async function handler(req: NextApiRequest, res: NextApiResponse, _user: TokenPayload) {
  if (req.method !== "GET") return res.status(405).end();

  const { data, error } = await supabaseAdmin
    .from("leader_profiles")
    .select(`
      id, is_verified, is_active,
      specialties, available_regions, available_times,
      bio, rating_avg, total_lectures, response_rate,
      profiles!leader_profiles_user_id_fkey(name, email)
    `)
    .eq("is_verified", true)
    .order("rating_avg", { ascending: false })
    .order("total_lectures", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []).map((l: any) => ({
    id:               l.id,
    name:             l.profiles?.name ?? "—",
    email:            l.profiles?.email ?? "",
    isVerified:       l.is_verified,
    isActive:         l.is_active ?? true,
    specialties:        Array.isArray(l.specialties)         ? l.specialties         : [],
    availableRegions:   Array.isArray(l.available_regions)  ? l.available_regions   : [],
    availableTimes:     l.available_times ?? null,
    preferredAudiences: [],
    bio:              l.bio ?? null,
    ratingAvg:        Number(l.rating_avg)      || 0,
    totalLectures:    Number(l.total_lectures)  || 0,
    responseRate:     Number(l.response_rate)   || 1,
  }));

  return res.status(200).json(rows);
}

export default requireAuth(handler, ["admin"]);
