import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAuth, type TokenPayload } from "@/lib/auth";

// PATCH /api/match-requests/:id/accept — 강사가 배정 수락 → status: 'ongoing'
async function handler(req: NextApiRequest, res: NextApiResponse, user: TokenPayload) {
  if (req.method !== "PATCH") return res.status(405).end();
  if (user.role !== "leader") return res.status(403).json({ error: "강사만 수락할 수 있습니다." });

  const { id } = req.query as { id: string };

  const { data: lp } = await supabaseAdmin
    .from("leader_profiles").select("id").eq("user_id", user.userId).maybeSingle();
  if (!lp) return res.status(404).json({ error: "강사 프로필이 없습니다." });

  const { data: match } = await supabaseAdmin
    .from("match_requests").select("id, status, leader_id").eq("id", id).maybeSingle();
  if (!match) return res.status(404).json({ error: "매칭 요청을 찾을 수 없습니다." });
  if (match.leader_id !== lp.id) return res.status(403).json({ error: "본인에게 배정된 요청이 아닙니다." });
  if (match.status !== "matched") return res.status(400).json({ error: "수락 가능한 상태가 아닙니다." });

  const { error } = await supabaseAdmin
    .from("match_requests").update({ status: "ongoing" }).eq("id", id);
  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ ok: true });
}

export default requireAuth(handler, ["leader"]);
