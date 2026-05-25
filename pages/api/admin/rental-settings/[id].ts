import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAuth, type TokenPayload } from "@/lib/auth";

async function handler(req: NextApiRequest, res: NextApiResponse, user: TokenPayload) {
  if (user.role !== "admin") return res.status(403).json({ error: "관리자만 접근 가능합니다." });

  const { id } = req.query as { id: string };

  if (req.method !== "PATCH") return res.status(405).end();

  const { fee_per_use, available, available_slots } = req.body as {
    fee_per_use?: number;
    available?: boolean;
    available_slots?: { days: string[]; start: string; end: string } | null;
  };

  const updates: Record<string, unknown> = {
    updated_by: user.userId,
    updated_at: new Date().toISOString(),
  };
  if (typeof fee_per_use === "number" && fee_per_use >= 0) updates.fee_per_use = fee_per_use;
  if (typeof available === "boolean") updates.available = available;
  if (available_slots !== undefined) updates.available_slots = available_slots;

  const { data, error } = await supabaseAdmin
    .from("rental_settings")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data);
}

export default requireAuth(handler);
