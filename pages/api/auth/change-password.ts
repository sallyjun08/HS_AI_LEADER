import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin, createAuthClient } from "@/lib/supabase-server";
import { requireAuth, type TokenPayload } from "@/lib/auth";

async function handler(req: NextApiRequest, res: NextApiResponse, user: TokenPayload) {
  if (req.method !== "POST") return res.status(405).end();

  const { currentPassword, newPassword } = req.body as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!currentPassword || !newPassword)
    return res.status(400).json({ error: "필수 값이 누락되었습니다." });
  if (newPassword.length < 6)
    return res.status(400).json({ error: "새 비밀번호는 6자 이상이어야 합니다." });
  if (currentPassword === newPassword)
    return res.status(400).json({ error: "새 비밀번호가 현재 비밀번호와 동일합니다." });

  // 현재 비밀번호 검증
  const { error: signInError } = await createAuthClient().auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (signInError) return res.status(401).json({ error: "현재 비밀번호가 올바르지 않습니다." });

  const { error } = await supabaseAdmin.auth.admin.updateUserById(user.userId, {
    password: newPassword,
  });
  if (error) return res.status(500).json({ error: "비밀번호 변경에 실패했습니다." });

  return res.status(200).json({ ok: true });
}

export default requireAuth(handler);
