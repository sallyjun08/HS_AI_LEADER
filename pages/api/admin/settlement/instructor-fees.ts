import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAuth, type TokenPayload } from "@/lib/auth";

async function handler(req: NextApiRequest, res: NextApiResponse, _user: TokenPayload) {
  if (req.method !== "GET") return res.status(405).end();

  const { data, error } = await supabaseAdmin
    .from("activity_reports")
    .select(`
      id,
      attendance_count,
      lecture_date,
      submitted_at,
      admin_approved_at,
      admin_note,
      report_text,
      image_urls,
      rating_from_client,
      instructor_fee,
      instructor_fee_paid_at,
      match:match_requests!activity_reports_match_id_fkey(
        id, title, category, address, location_type, frequency,
        leader:leader_profiles!match_requests_leader_id_fkey(
          id,
          profiles!leader_profiles_user_id_fkey(name, email)
        ),
        client:profiles!match_requests_client_id_fkey(name, email)
      )
    `)
    .not("admin_approved_at", "is", null)
    .order("lecture_date", { ascending: true, nullsFirst: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data ?? []);
}

export default requireAuth(handler, ["admin"]);
