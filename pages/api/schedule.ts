import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAuth, type TokenPayload } from "@/lib/auth";

async function handler(req: NextApiRequest, res: NextApiResponse, user: TokenPayload) {
  if (req.method !== "GET") return res.status(405).end();
  if (user.role !== "leader") return res.status(403).json({ error: "강사만 접근할 수 있습니다." });

  const { data: lp } = await supabaseAdmin
    .from("leader_profiles")
    .select("id")
    .eq("user_id", user.userId)
    .maybeSingle();
  if (!lp) return res.status(404).json({ error: "강사 프로필이 없습니다." });

  const { data, error } = await supabaseAdmin
    .from("match_requests")
    .select(`
      id, title, category, start_date, end_date, address, notes,
      participant_count, target_age, frequency, location_type,
      contact_phone,
      client_profile:profiles!match_requests_client_id_fkey(name, email, phone),
      materials:lecture_materials(
        id, title, file_url, file_type, file_size_kb, created_at,
        uploader:profiles!lecture_materials_uploader_id_fkey(name, role)
      )
    `)
    .eq("leader_id", lp.id)
    .eq("status", "ongoing")
    .order("start_date", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data ?? []);
}

export default requireAuth(handler, ["leader"]);
