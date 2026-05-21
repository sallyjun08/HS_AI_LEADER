import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAuth, type TokenPayload } from "@/lib/auth";

// POST /api/admin/match-requests/:id/assign — 관리자가 강사 배정 (매칭 점수 함께 기록)

async function handler(req: NextApiRequest, res: NextApiResponse, _user: TokenPayload) {
  if (req.method !== "POST") return res.status(405).end();

  const { id } = req.query as { id: string };
  const { leaderId, matchScore = 0, regionScore = 0, specialtyScore = 0, ratingScore = 0, experienceScore = 0 } =
    req.body as {
      leaderId: string;
      matchScore?: number;
      regionScore?: number;
      specialtyScore?: number;
      ratingScore?: number;
      experienceScore?: number;
    };

  if (!leaderId) return res.status(400).json({ error: "leaderId가 필요합니다." });

  const { data: lp } = await supabaseAdmin
    .from("leader_profiles").select("id").eq("id", leaderId).maybeSingle();
  if (!lp) return res.status(404).json({ error: "강사를 찾을 수 없습니다." });

  // 미승인 요청도 배정 시점에 자동 승인 처리
  await supabaseAdmin
    .from("match_requests")
    .update({ is_approved: true, reviewed_at: new Date().toISOString(), reviewed_by: _user.userId })
    .eq("id", id)
    .eq("is_approved", false);

  const { data, error } = await supabaseAdmin.rpc("assign_leader_with_score", {
    p_request_id:       id,
    p_leader_id:        leaderId,
    p_match_score:      matchScore,
    p_region_score:     regionScore,
    p_specialty_score:  specialtyScore,
    p_rating_score:     ratingScore,
    p_experience_score: experienceScore,
  });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data);
}

export default requireAuth(handler, ["admin"]);
