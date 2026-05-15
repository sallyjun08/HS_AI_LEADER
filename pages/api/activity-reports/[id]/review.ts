import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAuth, type TokenPayload } from "@/lib/auth";

// PATCH /api/activity-reports/:id/review — 수요처가 만족도 평점 제출

async function handler(req: NextApiRequest, res: NextApiResponse, user: TokenPayload) {
  if (req.method !== "PATCH") return res.status(405).end();
  if (user.role !== "client") return res.status(403).json({ error: "수요처만 평점을 작성할 수 있습니다." });

  const { id } = req.query as { id: string };
  const { rating } = req.body as { rating: number };

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "평점은 1~5 사이여야 합니다." });
  }

  const { data: report } = await supabaseAdmin
    .from("activity_reports")
    .select(`id, instructor_id, rating_from_client, match:match_requests!activity_reports_match_id_fkey(client_id)`)
    .eq("id", id)
    .single();

  if (!report) return res.status(404).json({ error: "보고서를 찾을 수 없습니다." });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((report.match as any)?.client_id !== user.userId) {
    return res.status(403).json({ error: "이 보고서에 대한 권한이 없습니다." });
  }

  if (report.rating_from_client !== null) {
    return res.status(409).json({ error: "이미 평점을 작성했습니다." });
  }

  const { data: updated, error } = await supabaseAdmin
    .from("activity_reports")
    .update({ rating_from_client: Number(rating) })
    .eq("id", id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  await supabaseAdmin.rpc("refresh_leader_rating", { p_leader_id: report.instructor_id });

  return res.status(200).json(updated);
}

export default requireAuth(handler);
