import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAuth, type TokenPayload } from "@/lib/auth";

// PATCH /api/admin/settlement/rental-fee/[id]
// body: { fee?: number; markPaid?: boolean }

async function handler(req: NextApiRequest, res: NextApiResponse, user: TokenPayload) {
  if (req.method !== "PATCH") return res.status(405).end();

  const { id } = req.query as { id: string };
  const { fee, markPaid } = req.body as { fee?: number; markPaid?: boolean };

  const updates: Record<string, unknown> = {};
  if (typeof fee === "number" && fee >= 0) updates.rental_fee_total = fee;
  if (markPaid === true) {
    updates.rental_fee_paid_at = new Date().toISOString();
    updates.rental_fee_paid_by = user.userId;
  }
  if (markPaid === false) {
    updates.rental_fee_paid_at = null;
    updates.rental_fee_paid_by = null;
  }

  if (Object.keys(updates).length === 0) return res.status(400).json({ error: "변경할 내용이 없습니다." });

  const { data, error } = await supabaseAdmin
    .from("match_requests")
    .update(updates)
    .eq("id", id)
    .select("id, rental_fee_total, rental_fee_paid_at")
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data);
}

export default requireAuth(handler, ["admin"]);
