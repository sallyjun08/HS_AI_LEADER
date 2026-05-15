import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { accessToken, password } = req.body as { accessToken: string; password: string };

  if (!accessToken || !password) {
    return res.status(400).json({ error: "필수 값이 누락되었습니다." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "비밀번호는 6자 이상이어야 합니다." });
  }

  // 복구 토큰으로 사용자 확인
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(accessToken);
  if (userError || !user) {
    return res.status(401).json({ error: "유효하지 않거나 만료된 링크입니다. 다시 요청해 주세요." });
  }

  // 비밀번호 업데이트
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, { password });
  if (updateError) return res.status(500).json({ error: updateError.message });

  return res.status(200).json({ ok: true });
}
