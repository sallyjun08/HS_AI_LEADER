import type { NextApiRequest, NextApiResponse } from "next";
import { createAuthClient } from "@/lib/supabase-server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { email } = req.body as { email: string };
  if (!email) return res.status(400).json({ error: "이메일이 필요합니다." });

  const origin = req.headers.origin ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:9002";

  const { error } = await createAuthClient().auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });

  if (error) {
    console.error("[resend-verification]", error.status, error.message, error.code);
    if (error.status === 429 || error.code === "over_email_send_rate_limit") {
      return res.status(429).json({ error: "잠시 후 다시 시도해 주세요. 이메일 발송은 1분에 1회로 제한됩니다." });
    }
    return res.status(500).json({ error: "메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요." });
  }
  return res.status(200).json({ ok: true });
}
