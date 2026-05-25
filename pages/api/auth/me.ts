import type { NextApiRequest, NextApiResponse } from "next";
import { getUserFromRequest } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "로그인이 필요합니다." });

  const [lpResult, profileResult] = await Promise.all([
    supabaseAdmin
      .from("leader_profiles")
      .select("id, is_verified, is_active, specialties, available_regions, available_times, rating_avg, total_lectures, max_classes_month")
      .eq("user_id", user.userId)
      .maybeSingle(),
    supabaseAdmin
      .from("profiles")
      .select("org_name, org_type")
      .eq("id", user.userId)
      .maybeSingle(),
  ]);

  const lp = lpResult.data;
  const profile = profileResult.data;

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    id: user.userId,
    email: user.email,
    name: user.name,
    role: user.role,
    orgName: profile?.org_name ?? null,
    orgType: profile?.org_type ?? null,
    leaderProfile: lp
      ? {
          id: lp.id,
          isVerified: lp.is_verified,
          isActive: lp.is_active,
          specialties: lp.specialties ?? [],
          availableRegions: lp.available_regions ?? [],
          availableTimes: lp.available_times ?? null,
          ratingAvg: lp.rating_avg ?? 0,
          totalLectures: lp.total_lectures ?? 0,
          maxClassesMonth: lp.max_classes_month ?? 10,
          preferredAudiences: [],
        }
      : null,
  });
}
