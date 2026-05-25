import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAuth, type TokenPayload } from "@/lib/auth";

async function handler(req: NextApiRequest, res: NextApiResponse, user: TokenPayload) {
  if (user.role !== "admin") return res.status(403).json({ error: "관리자만 접근 가능합니다." });

  const { id } = req.query as { id: string };

  if (req.method === "PATCH") {
    const { name, address, capacity, features, fee_per_use, fee_unit, max_quantity, available, available_slots } =
      req.body as {
        name?: string; address?: string; capacity?: number;
        features?: string[]; fee_per_use?: number; fee_unit?: string;
        max_quantity?: number; available?: boolean;
        available_slots?: { days: string[]; start: string; end: string } | null;
      };

    const updates: Record<string, unknown> = {
      updated_by: user.userId,
      updated_at: new Date().toISOString(),
    };
    if (name !== undefined)            updates.name = name.trim();
    if (address !== undefined)         updates.address = address?.trim() ?? null;
    if (capacity !== undefined)        updates.capacity = capacity;
    if (Array.isArray(features))       updates.features = features;
    if (typeof fee_per_use === "number" && fee_per_use >= 0) updates.fee_per_use = fee_per_use;
    if (fee_unit !== undefined)        updates.fee_unit = fee_unit?.trim() || "회";
    if (max_quantity !== undefined)    updates.max_quantity = max_quantity;
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

  if (req.method === "DELETE") {
    const { error } = await supabaseAdmin.from("rental_settings").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}

export default requireAuth(handler);
