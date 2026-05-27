import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAuth, type TokenPayload } from "@/lib/auth";

// POST /api/admin/match-requests/:id/unmatch
// 관리자가 매칭 시도를 취소 → pending 상태로 복귀 (거절 아님)

async function handler(req: NextApiRequest, res: NextApiResponse, _user: TokenPayload) {
  if (req.method !== "POST") return res.status(405).end();

  const { id } = req.query as { id: string };

  const { data: match } = await supabaseAdmin
    .from("match_requests")
    .select("id, status")
    .eq("id", id)
    .maybeSingle();

  if (!match) return res.status(404).json({ error: "요청을 찾을 수 없습니다." });
  if (match.status !== "matched") return res.status(400).json({ error: "매칭 시도 중인 상태가 아닙니다." });

  const { error } = await supabaseAdmin
    .from("match_requests")
    .update({ status: "pending", leader_id: null, matched_at: null })
    .eq("id", id);

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ ok: true });
}

export default requireAuth(handler, ["admin"]);
