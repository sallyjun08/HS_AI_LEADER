import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";

// GET /api/cron/auto-reject
// Vercel Cron: 매 시간 실행 — matched 상태로 24시간이 지난 요청을 자동 거절 처리

const TIMEOUT_HOURS = 24;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  // Vercel Cron 인증 (CRON_SECRET 환경변수)
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${secret}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  const cutoff = new Date(Date.now() - TIMEOUT_HOURS * 60 * 60 * 1000).toISOString();

  // 24시간이 지난 matched 요청 조회
  const { data: stale, error: fetchErr } = await supabaseAdmin
    .from("match_requests")
    .select("id, title, leader_id, matched_at")
    .eq("status", "matched")
    .not("matched_at", "is", null)
    .lt("matched_at", cutoff);

  if (fetchErr) return res.status(500).json({ error: fetchErr.message });
  if (!stale || stale.length === 0) {
    return res.status(200).json({ processed: 0, message: "자동 거절 대상 없음" });
  }

  const rejected: string[] = [];
  const failed:   string[] = [];

  for (const match of stale) {
    // reject_match RPC 호출 (기존 거절 로직과 동일)
    const { error: rpcErr } = await supabaseAdmin.rpc("reject_match", {
      p_request_id: match.id,
      p_leader_id:  match.leader_id,
    });

    if (rpcErr) {
      failed.push(match.id);
      continue;
    }

    // 자동 거절 사유 기록
    await supabaseAdmin
      .from("match_requests")
      .update({ reject_reason: "24시간 내 미응답으로 자동 거절 처리되었습니다." })
      .eq("id", match.id);

    rejected.push(match.id);
  }

  return res.status(200).json({
    processed: stale.length,
    rejected:  rejected.length,
    failed:    failed.length,
    ids:       rejected,
  });
}
