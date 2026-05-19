import type { NextApiRequest, NextApiResponse } from "next";
import { getUserFromRequest } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "로그인이 필요합니다." });

  const { data: lp } = await supabaseAdmin
    .from("leader_profiles")
    .select("id, cert_level, is_verified, is_active, specialties, available_regions, available_times, rating_avg, total_lectures, max_classes_month")
    .eq("user_id", user.userId)
    .maybeSingle();

  return res.status(200).json({
    id: user.userId,
    email: user.email,
    name: user.name,
    role: user.role,
    leaderProfile: lp
      ? {
          id: lp.id,
          certLevel: lp.cert_level,
          isVerified: lp.is_verified,
          isActive: lp.is_active,
          specialties: lp.specialties ?? [],
          availableRegions: lp.available_regions ?? [],
          availableTimes: lp.available_times ?? null,
          ratingAvg: lp.rating_avg ?? 0,
          totalLectures: lp.total_lectures ?? 0,
          maxClassesMonth: lp.max_classes_month ?? 10,
        }
      : null,
  });
}
