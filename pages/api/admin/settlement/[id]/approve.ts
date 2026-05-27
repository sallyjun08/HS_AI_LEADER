import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAuth, type TokenPayload } from "@/lib/auth";

// PATCH /api/admin/settlement/[id]/approve
// body: { note?: string }  — 보고서 최종 승인 (수요처 평가 완료 후에만 가능)

async function handler(req: NextApiRequest, res: NextApiResponse, user: TokenPayload) {
  if (req.method !== "PATCH") return res.status(405).end();

  const { id } = req.query as { id: string };
  const { note } = (req.body ?? {}) as { note?: string };

  const { data: report } = await supabaseAdmin
    .from("activity_reports")
    .select("id, match_id, rating_from_client, client_rejected_at, admin_approved_at")
    .eq("id", id)
    .single();

  if (!report) return res.status(404).json({ error: "보고서를 찾을 수 없습니다." });
  if (report.client_rejected_at) {
    return res.status(409).json({ error: "수요처가 반려한 보고서입니다. 강사가 재작성한 후 승인할 수 있습니다." });
  }
  if (report.rating_from_client === null) {
    return res.status(409).json({ error: "수요처가 아직 평가하지 않은 보고서입니다. 수요처 평가 완료 후 최종 승인할 수 있습니다." });
  }

  const { data, error } = await supabaseAdmin
    .from("activity_reports")
    .update({
      admin_approved_at: new Date().toISOString(),
      admin_approved_by: user.userId,
      ...(note?.trim() ? { admin_note: note.trim() } : {}),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // 최종 승인 시 매칭 완료 처리
  await supabaseAdmin
    .from("match_requests")
    .update({ status: "completed" })
    .eq("id", report.match_id);

  return res.status(200).json(data);
}

export default requireAuth(handler, ["admin"]);
