import type { NextApiRequest, NextApiResponse } from "next";
import { createAuthClient, supabaseAdmin } from "@/lib/supabase-server";
import { setAuthCookie } from "@/lib/auth";

// POST /api/auth/callback
// 이메일 인증 완료 후 code(PKCE) 또는 access_token(implicit)을 받아 세션 쿠키 발급

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { code, access_token } = req.body as { code?: string; access_token?: string };

  // PKCE 방식 (Supabase JS v2 기본)
  if (code) {
    const { data, error } = await createAuthClient().auth.exchangeCodeForSession(code);
    if (error || !data.session) {
      return res.status(400).json({ error: "이메일 인증에 실패했습니다. 링크가 만료되었을 수 있습니다." });
    }
    setAuthCookie(res, data.session.access_token);
    return res.status(200).json({ ok: true });
  }

  // Implicit 방식 (레거시 fallback)
  if (access_token) {
    const { data, error } = await supabaseAdmin.auth.getUser(access_token);
    if (error || !data.user) {
      return res.status(400).json({ error: "이메일 인증에 실패했습니다." });
    }
    setAuthCookie(res, access_token);
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: "인증 정보가 없습니다." });
}
