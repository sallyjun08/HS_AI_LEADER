import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAuth, type TokenPayload } from "@/lib/auth";

async function handler(req: NextApiRequest, res: NextApiResponse, user: TokenPayload) {
  if (user.role !== "admin") return res.status(403).json({ error: "관리자만 접근 가능합니다." });

  if (req.method === "GET") {
    const { data, error } = await supabaseAdmin
      .from("rental_settings")
      .select("*")
      .order("type")
      .order("name");
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data ?? []);
  }

  if (req.method === "POST") {
    const { type, name, address, capacity, features, fee_per_use, fee_unit, max_quantity, available, available_slots } =
      req.body as {
        type: string; name: string; address?: string; capacity?: number;
        features?: string[]; fee_per_use?: number; fee_unit?: string;
        max_quantity?: number; available?: boolean;
        available_slots?: { days: string[]; start: string; end: string } | null;
      };

    if (!type || !name?.trim()) return res.status(400).json({ error: "유형과 이름은 필수입니다." });

    const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const { data, error } = await supabaseAdmin
      .from("rental_settings")
      .insert({
        id,
        type,
        name: name.trim(),
        address: address?.trim() ?? null,
        capacity: capacity ?? null,
        features: Array.isArray(features) ? features : [],
        fee_per_use: fee_per_use ?? 0,
        fee_unit: fee_unit?.trim() || (type === "equipment" ? "대·회" : "회"),
        max_quantity: max_quantity ?? null,
        available: available ?? true,
        available_slots: available_slots ?? null,
        updated_by: user.userId,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  return res.status(405).end();
}

export default requireAuth(handler);
