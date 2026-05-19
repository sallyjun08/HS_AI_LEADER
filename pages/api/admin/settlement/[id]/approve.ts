import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAuth, type TokenPayload } from "@/lib/auth";

// PATCH /api/admin/settlement/[id]/approve
// body: { note?: string }  — 보고서 승인 처리

async function handler(req: NextApiRequest, res: NextApiResponse, user: TokenPayload) {
  if (req.method !== "PATCH") return res.status(405).end();

  const { id } = req.query as { id: string };
  const { note } = (req.body ?? {}) as { note?: string };

  const { data, error } = await supabaseAdmin
    .from("activity_reports")
    .update({
      admin_approved_at: new Date().toISOString(),
      admin_approved_by: user.userId,
      ...(note?.trim() ? { admin_note: note.trim() } : {}),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data);
}

export default requireAuth(handler, ["admin"]);
