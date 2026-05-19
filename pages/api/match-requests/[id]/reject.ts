import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAuth, type TokenPayload } from "@/lib/auth";

// POST /api/match-requests/:id/reject — 강사가 배정 거절 → reject_match RPC 호출
async function handler(req: NextApiRequest, res: NextApiResponse, user: TokenPayload) {
  if (req.method !== "POST") return res.status(405).end();
  if (user.role !== "leader") return res.status(403).json({ error: "강사만 거절할 수 있습니다." });

  const { id } = req.query as { id: string };

  const { data: lp } = await supabaseAdmin
    .from("leader_profiles").select("id").eq("user_id", user.userId).maybeSingle();
  if (!lp) return res.status(404).json({ error: "강사 프로필이 없습니다." });

  const { data: match } = await supabaseAdmin
    .from("match_requests").select("id, status, leader_id").eq("id", id).maybeSingle();
  if (!match) return res.status(404).json({ error: "매칭 요청을 찾을 수 없습니다." });
  if (match.leader_id !== lp.id) return res.status(403).json({ error: "본인에게 배정된 요청이 아닙니다." });
  if (match.status !== "matched") return res.status(400).json({ error: "거절 가능한 상태가 아닙니다." });

  const { error } = await supabaseAdmin.rpc("reject_match", {
    p_request_id: id,
    p_leader_id: lp.id,
  });
  if (error) return res.status(500).json({ error: error.message });

  const reason = (req.body as { reason?: string })?.reason?.trim() ?? null;
  if (reason) {
    await supabaseAdmin.from("match_requests").update({ reject_reason: reason }).eq("id", id);
  }

  return res.status(200).json({ ok: true });
}

export default requireAuth(handler, ["leader"]);
