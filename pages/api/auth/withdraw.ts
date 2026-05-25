import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAuth, clearAuthCookie, type TokenPayload } from "@/lib/auth";

async function handler(req: NextApiRequest, res: NextApiResponse, user: TokenPayload) {
  if (req.method !== "DELETE") return res.status(405).end();
  if (user.role === "admin") return res.status(403).json({ error: "관리자 계정은 탈퇴할 수 없습니다." });

  const { data: lp } = await supabaseAdmin
    .from("leader_profiles")
    .select("id")
    .eq("user_id", user.userId)
    .maybeSingle();

  if (lp) {
    await supabaseAdmin.from("leader_profiles").delete().eq("user_id", user.userId);
  }

  await supabaseAdmin.from("profiles").delete().eq("id", user.userId);

  const { error } = await supabaseAdmin.auth.admin.deleteUser(user.userId);
  if (error) return res.status(500).json({ error: "계정 삭제에 실패했습니다." });

  clearAuthCookie(res);
  return res.status(200).json({ ok: true });
}

export default requireAuth(handler);
