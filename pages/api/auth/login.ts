import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin, createAuthClient } from "@/lib/supabase-server";
import { setAuthCookie } from "@/lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, password, role: expectedRole } = req.body as { email: string; password: string; role?: string };
  if (!email || !password) return res.status(400).json({ error: "이메일과 비밀번호를 입력해 주세요." });

  // 인증 전용 클라이언트 사용 (supabaseAdmin 세션 오염 방지)
  const { data, error } = await createAuthClient().auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    if (error?.message.toLowerCase().includes("email not confirmed")) {
      return res.status(403).json({ error: "이메일 인증이 완료되지 않았습니다.", unverified: true, email });
    }
    return res.status(401).json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role, name")
    .eq("id", data.user.id)
    .single();

  if (!profile) return res.status(401).json({ error: "사용자 프로필을 찾을 수 없습니다." });

  if (expectedRole && profile.role !== expectedRole) {
    const ROLE_NAMES: Record<string, string> = { leader: "시민 리더", client: "수요처", admin: "운영자" };
    const selected = ROLE_NAMES[expectedRole] ?? expectedRole;
    const actual   = ROLE_NAMES[profile.role as string] ?? profile.role;
    return res.status(403).json({ error: `${selected} 계정이 아닙니다. 이 계정은 ${actual}로 등록되어 있습니다.` });
  }

  setAuthCookie(res, data.session.access_token);
  return res.status(200).json({ id: data.user.id, email: data.user.email, role: profile.role, name: profile.name });
}
