import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";

function maskName(name: string): string {
  if (name.length <= 1) return "*";
  if (name.length === 2) return name[0] + "*";
  return name[0] + "*".repeat(name.length - 2) + name[name.length - 1];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const { specialty, region, verified } = req.query as Record<string, string>;

  let query = supabaseAdmin
    .from("leader_profiles")
    .select("id, is_verified, specialties, available_regions, bio, rating_avg, total_lectures, profiles!leader_profiles_user_id_fkey(name)")
    .eq("is_active", true)
    .order("rating_avg", { ascending: false })
    .order("total_lectures", { ascending: false });

  if (verified === "true") query = query.eq("is_verified", true);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let results = (data ?? []).map((l: any) => ({
    id: l.id as string,
    maskedName: maskName((l.profiles?.name as string) ?? "강사"),
    isVerified: (l.is_verified as boolean) ?? false,
    specialties: (l.specialties as string[]) ?? [],
    availableRegions: (l.available_regions as string[]) ?? [],
    bio: (l.bio as string | null) ?? null,
    ratingAvg: (l.rating_avg as number) ?? 0,
    totalLectures: (l.total_lectures as number) ?? 0,
  }));

  if (specialty) {
    const kw = specialty.toLowerCase();
    results = results.filter((l) =>
      l.specialties.some((s) => s.toLowerCase().includes(kw) || kw.includes(s.toLowerCase()))
    );
  }

  if (region) {
    results = results.filter((l) =>
      l.availableRegions.some((r) => r.includes(region) || region.includes(r))
    );
  }

  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");
  return res.status(200).json(results);
}
