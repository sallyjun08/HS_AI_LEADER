import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAuth, type TokenPayload } from "@/lib/auth";

// PATCH /api/activity-reports/:id/approve
// 수요처가 중간 회차 보고서를 평점 없이 승인 (rating_from_client = 0)

async function handler(req: NextApiRequest, res: NextApiResponse, user: TokenPayload) {
  if (req.method !== "PATCH") return res.status(405).end();
  if (user.role !== "client") return res.status(403).json({ error: "수요처만 승인할 수 있습니다." });

  const { id } = req.query as { id: string };

  const { data: report } = await supabaseAdmin
    .from("activity_reports")
    .select(`id, rating_from_client, client_rejected_at, client_approved_at, match:match_requests!activity_reports_match_id_fkey(client_id)`)
    .eq("id", id)
    .single();

  if (!report) return res.status(404).json({ error: "보고서를 찾을 수 없습니다." });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((report.match as any)?.client_id !== user.userId)
    return res.status(403).json({ error: "이 보고서에 대한 권한이 없습니다." });
  if ((report as any).client_approved_at || report.rating_from_client !== null)
    return res.status(409).json({ error: "이미 처리된 보고서입니다." });
  if (report.client_rejected_at)
    return res.status(409).json({ error: "반려된 보고서는 승인할 수 없습니다." });

  const { data: updated, error } = await supabaseAdmin
    .from("activity_reports")
    .update({ client_approved_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(updated);
}

export default requireAuth(handler);
