import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth";
import { maskLeader, scoreLeaderForRequest } from "@/lib/masking";

async function handler(req: NextApiRequest, res: NextApiResponse, user: { userId: string; role: string }) {
  if (req.method === "GET") {
    const { category, location, verified } = req.query as Record<string, string>;

    let query = supabaseAdmin
      .from("leader_profiles")
      .select("*, profiles!leader_profiles_user_id_fkey(name)")
      .eq("is_active", true)
      .order("rating_avg", { ascending: false })
      .order("total_lectures", { ascending: false });

    if (verified === "true") query = query.eq("is_verified", true);

    const { data: leaders, error } = await query;
    if (error) return res.status(500).json({ error: error.message });

    const results = (leaders ?? []).map((l) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const name = (l as any).profiles?.name ?? "";
      const mapped = toShape(l, name);
      const masked = maskLeader(mapped, user.role === "admin");
      if (category || location) {
        (masked as { matchScore?: number }).matchScore = scoreLeaderForRequest(mapped, {
          category: category ?? "",
          location: location ?? "",
        });
      }
      return masked;
    });

    if (category || location) {
      results.sort(
        (a, b) =>
          ((b as { matchScore?: number }).matchScore ?? 0) -
          ((a as { matchScore?: number }).matchScore ?? 0)
      );
    }

    return res.status(200).json(results);
  }

  if (req.method === "PUT") {
    if (user.role !== "leader") return res.status(403).json({ error: "강사만 수정할 수 있습니다." });

    const { bio, specialties, availableRegions, availableTimes, phone, lat, lng, preferredAudiences } = req.body as {
      bio?: string;
      specialties?: string[];
      availableRegions?: string[];
      availableTimes?: object;
      phone?: string;
      lat?: number;
      lng?: number;
      /** 강사가 설정한 선호/특화 교육 대상 — 매칭 시 대상 적합도 점수 산정에 사용됨 */
      preferredAudiences?: string[];
    };

    const updateData: Record<string, unknown> = {};
    if (bio !== undefined) updateData.bio = bio;
    if (specialties !== undefined) updateData.specialties = specialties;
    if (availableRegions !== undefined) updateData.available_regions = availableRegions;
    if (availableTimes !== undefined) updateData.available_times = availableTimes;
    if (phone !== undefined) updateData.phone = phone;
    // preferred_audiences column does not exist in DB — omit
    if (lat !== undefined && lng !== undefined) {
      updateData.lat = lat;
      updateData.lng = lng;
      updateData.location = `POINT(${lng} ${lat})`;
    }

    const { data, error } = await supabaseAdmin
      .from("leader_profiles")
      .update(updateData)
      .eq("user_id", user.userId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  return res.status(405).end();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toShape(l: any, name: string) {
  return {
    id: l.id,
    name,
    isVerified: l.is_verified ?? false,
    specialties: l.specialties ?? [],
    availableRegions: l.available_regions ?? [],
    bio: l.bio ?? null,
    phone: l.phone ?? null,
    ratingAvg: l.rating_avg ?? 0,
    totalLectures: l.total_lectures ?? 0,
    lat: l.lat ?? null,
    lng: l.lng ?? null,
  };
}

export { toShape };
export default requireAuth(handler);
