import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAuth, type TokenPayload } from "@/lib/auth";

// PATCH /api/admin/leaders/:id/active — 강사 is_active 변경
async function handler(req: NextApiRequest, res: NextApiResponse, _user: TokenPayload) {
  if (req.method !== "PATCH") return res.status(405).end();

  const { id } = req.query as { id: string };
  const { isActive } = req.body as { isActive: boolean };

  const { data, error } = await supabaseAdmin
    .from("leader_profiles")
    .update({ is_active: isActive })
    .eq("id", id)
    .select("id, is_active")
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data);
}

export default requireAuth(handler, ["admin"]);
