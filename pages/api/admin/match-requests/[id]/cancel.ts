import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAuth, type TokenPayload } from "@/lib/auth";

// PATCH /api/admin/match-requests/:id/cancel
// 요청 반려/취소 — status=cancelled, cancel_reason 저장

async function handler(req: NextApiRequest, res: NextApiResponse, user: TokenPayload) {
  if (req.method !== "PATCH") return res.status(405).end();

  const { id } = req.query as { id: string };
  const { reason } = req.body as { reason?: string };

  if (!reason?.trim()) {
    return res.status(400).json({ error: "반려 사유를 입력해주세요." });
  }

  const { data, error } = await supabaseAdmin
    .from("match_requests")
    .update({
      status: "cancelled",
      cancel_reason: reason.trim(),
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.userId,
    })
    .eq("id", id)
    .eq("status", "pending")
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "요청을 찾을 수 없거나 이미 처리된 요청입니다." });
  return res.status(200).json(data);
}

export default requireAuth(handler, ["admin"]);
