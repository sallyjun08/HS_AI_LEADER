import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAuth, type TokenPayload } from "@/lib/auth";

async function handler(req: NextApiRequest, res: NextApiResponse, _user: TokenPayload) {
  if (req.method !== "GET") return res.status(405).end();

  const [{ data: matches, error: me }, { data: settings, error: se }] = await Promise.all([
    supabaseAdmin
      .from("match_requests")
      .select(`
        id, title, category, start_date, status,
        needs_venue, rental_venue_id,
        needs_equipment, rental_equipment_count, rental_notes,
        rental_fee_total, rental_fee_paid_at,
        client:profiles!match_requests_client_id_fkey(name, email)
      `)
      .or("needs_venue.eq.true,needs_equipment.eq.true")
      .order("start_date", { ascending: false }),
    supabaseAdmin
      .from("rental_settings")
      .select("id, name, type, fee_per_use, fee_unit"),
  ]);

  if (me) return res.status(500).json({ error: me.message });
  if (se) return res.status(500).json({ error: se.message });

  const settingsMap = Object.fromEntries((settings ?? []).map((s) => [s.id, s]));
  const equipmentItems = (settings ?? []).filter((s) => s.type === "equipment" && s.fee_per_use > 0);
  const equipFeePerUnit = equipmentItems[0]?.fee_per_use ?? 0;

  const rows = (matches ?? []).map((m) => {
    const venueFee = m.needs_venue && m.rental_venue_id ? (settingsMap[m.rental_venue_id]?.fee_per_use ?? 0) : 0;
    const equipFee = m.needs_equipment ? equipFeePerUnit * m.rental_equipment_count : 0;
    return {
      ...m,
      venue: m.rental_venue_id ? (settingsMap[m.rental_venue_id] ?? null) : null,
      equipment_fee_per_unit: equipFeePerUnit,
      suggested_fee: venueFee + equipFee,
    };
  });

  return res.status(200).json(rows);
}

export default requireAuth(handler, ["admin"]);
