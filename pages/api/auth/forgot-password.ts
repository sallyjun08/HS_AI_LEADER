import type { NextApiRequest, NextApiResponse } from "next";
import { createAuthClient } from "@/lib/supabase-server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { email } = req.body as { email: string };
  if (!email) return res.status(400).json({ error: "이메일을 입력해 주세요." });

  const origin = req.headers.origin ?? `http://${req.headers.host}`;
  const { error } = await createAuthClient().auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  });

  if (error) return res.status(500).json({ error: error.message });

  // 이메일 존재 여부를 노출하지 않기 위해 항상 200 반환
  return res.status(200).json({ ok: true });
}
