import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAuth, type TokenPayload } from "@/lib/auth";

// PATCH /api/admin/settlement/[id]/instructor-fee
// body: { fee?: number; markPaid?: boolean }

async function handler(req: NextApiRequest, res: NextApiResponse, user: TokenPayload) {
  if (req.method !== "PATCH") return res.status(405).end();

  const { id } = req.query as { id: string };
  const { fee, markPaid } = req.body as { fee?: number; markPaid?: boolean };

  const updates: Record<string, unknown> = {};
  if (typeof fee === "number" && fee >= 0) updates.instructor_fee = fee;
  if (markPaid === true) {
    updates.instructor_fee_paid_at = new Date().toISOString();
    updates.instructor_fee_paid_by = user.userId;
  }
  if (markPaid === false) {
    updates.instructor_fee_paid_at = null;
    updates.instructor_fee_paid_by = null;
  }

  if (Object.keys(updates).length === 0) return res.status(400).json({ error: "변경할 내용이 없습니다." });

  const { data, error } = await supabaseAdmin
    .from("activity_reports")
    .update(updates)
    .eq("id", id)
    .select("id, instructor_fee, instructor_fee_paid_at")
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data);
}

export default requireAuth(handler, ["admin"]);
