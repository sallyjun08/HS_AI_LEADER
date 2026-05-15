import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAuth, type TokenPayload } from "@/lib/auth";

// PATCH /api/admin/leaders/:id/verify — 강사 인증 처리

async function handler(req: NextApiRequest, res: NextApiResponse, _user: TokenPayload) {
  if (req.method !== "PATCH") return res.status(405).end();

  const { id } = req.query as { id: string };
  const { isVerified, certLevel } = req.body as { isVerified: boolean; certLevel?: number };

  const { data, error } = await supabaseAdmin
    .from("leader_profiles")
    .update({
      is_verified: isVerified,
      ...(certLevel !== undefined && { cert_level: certLevel }),
    })
    .eq("id", id)
    .select("*, profiles!leader_profiles_user_id_fkey(name, email)")
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data);
}

export default requireAuth(handler, ["admin"]);
