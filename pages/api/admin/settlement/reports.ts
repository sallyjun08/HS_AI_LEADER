import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAuth, type TokenPayload } from "@/lib/auth";

// GET /api/admin/settlement/reports
// activity_reports 전체 목록 (반려 이력 포함)

async function handler(req: NextApiRequest, res: NextApiResponse, _user: TokenPayload) {
  if (req.method !== "GET") return res.status(405).end();

  const { data, error } = await supabaseAdmin
    .from("activity_reports")
    .select(`
      id,
      attendance_count,
      image_urls,
      report_text,
      rating_from_client,
      client_feedback,
      submitted_at,
      lecture_date,
      lecture_dates,
      client_rejected_at,
      client_rejection_reason,
      rejection_history,
      admin_approved_at,
      admin_approved_by,
      admin_note,
      match:match_requests!activity_reports_match_id_fkey(
        id, title, category, address, start_date,
        participant_count, frequency, location_type,
        leader:leader_profiles!match_requests_leader_id_fkey(
          id,
          profiles!leader_profiles_user_id_fkey(name, email)
        ),
        client:profiles!match_requests_client_id_fkey(name, email)
      )
    `)
    .order("submitted_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []).filter((r: any) => r.match !== null);

  return res.status(200).json(rows);
}

export default requireAuth(handler, ["admin"]);
