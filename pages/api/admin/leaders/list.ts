import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAuth, type TokenPayload } from "@/lib/auth";

// GET /api/admin/leaders/list — 전체 강사 목록 (is_active 무관, 프로필 조인)
async function handler(req: NextApiRequest, res: NextApiResponse, _user: TokenPayload) {
  if (req.method !== "GET") return res.status(405).end();

  const { data, error } = await supabaseAdmin
    .from("leader_profiles")
    .select("*, profiles!leader_profiles_user_id_fkey(name, email, created_at)")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []).map((l: any) => {
    const p = l.profiles as { name: string; email: string; created_at: string } | null;
    return {
      id:              l.id,
      userId:          l.user_id,
      name:            p?.name ?? "-",
      email:           p?.email ?? "-",
      joinedAt:        p?.created_at ?? l.created_at,
      certLevel:       l.cert_level ?? 1,
      certNumber:      l.cert_number ?? null,
      certImageUrl:    l.cert_image_url ?? null,
      isVerified:      l.is_verified ?? false,
      isActive:        l.is_active ?? true,
      specialties:     Array.isArray(l.specialties) ? l.specialties : [],
      availableRegions: Array.isArray(l.available_regions) ? l.available_regions : [],
      bio:             l.bio ?? null,
      ratingAvg:       l.rating_avg ?? 0,
      totalLectures:   l.total_lectures ?? 0,
    };
  });

  return res.status(200).json(rows);
}

export default requireAuth(handler, ["admin"]);
