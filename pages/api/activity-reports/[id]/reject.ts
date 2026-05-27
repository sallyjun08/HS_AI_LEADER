import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAuth, type TokenPayload } from "@/lib/auth";

// PATCH /api/activity-reports/:id/reject — 수요처가 보고서 반려 (재작성 요청)

async function handler(req: NextApiRequest, res: NextApiResponse, user: TokenPayload) {
  if (req.method !== "PATCH") return res.status(405).end();
  if (user.role !== "client") return res.status(403).json({ error: "수요처만 보고서를 반려할 수 있습니다." });

  const { id } = req.query as { id: string };
  const { reason } = req.body as { reason?: string };

  if (!reason?.trim()) {
    return res.status(400).json({ error: "반려 사유를 입력해 주세요." });
  }

  const { data: report } = await supabaseAdmin
    .from("activity_reports")
    .select(`id, client_rejected_at, rating_from_client, match:match_requests!activity_reports_match_id_fkey(client_id)`)
    .eq("id", id)
    .single();

  if (!report) return res.status(404).json({ error: "보고서를 찾을 수 없습니다." });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((report.match as any)?.client_id !== user.userId) {
    return res.status(403).json({ error: "이 보고서에 대한 권한이 없습니다." });
  }

  if (report.rating_from_client !== null || (report as any).client_approved_at) {
    return res.status(409).json({ error: "이미 승인된 보고서는 반려할 수 없습니다." });
  }
  if (report.client_rejected_at) {
    return res.status(409).json({ error: "이미 반려된 보고서입니다." });
  }

  const { data: updated, error } = await supabaseAdmin
    .from("activity_reports")
    .update({
      client_rejected_at:      new Date().toISOString(),
      client_rejection_reason: reason.trim(),
      admin_approved_at:       null,  // 재작성 후 재승인 필요
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json(updated);
}

export default requireAuth(handler);
