import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth";
import { maskLeader } from "@/lib/masking";
import { toShape } from "./index";

async function handler(req: NextApiRequest, res: NextApiResponse, user: { userId: string; role: string }) {
  const { id } = req.query as { id: string };

  if (req.method === "GET") {
    const { data: l, error } = await supabaseAdmin
      .from("leader_profiles")
      .select("*, profiles!leader_profiles_user_id_fkey(name)")
      .eq("id", id)
      .single();

    if (error || !l) return res.status(404).json({ error: "강사를 찾을 수 없습니다." });

    let isRevealed = user.role === "admin";

    if (!isRevealed && user.role === "client") {
      const { data: req_ } = await supabaseAdmin
        .from("match_requests")
        .select("id")
        .eq("leader_id", id)
        .eq("client_id", user.userId)
        .in("status", ["matched", "ongoing"])
        .maybeSingle();
      isRevealed = !!req_;
    }

    if (!isRevealed && user.role === "leader" && l.user_id === user.userId) {
      isRevealed = true;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return res.status(200).json(maskLeader(toShape(l, (l as any).profiles?.name ?? ""), isRevealed));
  }

  return res.status(405).end();
}

export default requireAuth(handler);
