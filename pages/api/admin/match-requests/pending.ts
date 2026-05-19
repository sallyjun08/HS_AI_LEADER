import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAuth, type TokenPayload } from "@/lib/auth";

// GET /api/admin/match-requests/pending
// 검토 대기 중인 교육 요청 목록 (status=pending, is_approved=false)

async function handler(req: NextApiRequest, res: NextApiResponse, _user: TokenPayload) {
  if (req.method !== "GET") return res.status(405).end();

  const { data, error } = await supabaseAdmin
    .from("match_requests")
    .select(`
      id, title, category, target_age, participant_count,
      institution_type, address, start_date, end_date,
      notes, frequency, location_type, status,
      is_approved, cancel_reason, reviewed_at, created_at,
      client:profiles!match_requests_client_id_fkey(name, email)
    `)
    .eq("status", "pending")
    .eq("is_approved", false)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data ?? []);
}

export default requireAuth(handler, ["admin"]);
