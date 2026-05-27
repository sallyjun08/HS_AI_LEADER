import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAuth, type TokenPayload } from "@/lib/auth";

// GET /api/admin/matching-center/requests
// 매칭 센터용 — pending(is_approved=true) + rejected 요청 목록
// rejected를 앞에 정렬하여 반환

async function handler(req: NextApiRequest, res: NextApiResponse, _user: TokenPayload) {
  if (req.method !== "GET") return res.status(405).end();

  const { data, error } = await supabaseAdmin
    .from("match_requests")
    .select(`
      id, title, category, target_audience, participant_count,
      institution_type, address, start_date, notes,
      frequency, location_type, status, is_approved,
      prev_leader_id, leader_id, matched_at, created_at, updated_at,
      client:profiles!match_requests_client_id_fkey(name, email, org_name, org_type),
      leader:leader_profiles!match_requests_leader_id_fkey(
        profiles!leader_profiles_user_id_fkey(name)
      )
    `)
    .or("status.eq.matched,status.eq.rejected,and(status.eq.pending,is_approved.eq.true)")
    .order("created_at", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data ?? []);
}

export default requireAuth(handler, ["admin"]);
