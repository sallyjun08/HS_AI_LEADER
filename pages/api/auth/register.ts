import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin, createAuthClient } from "@/lib/supabase-server";
import { setAuthCookie } from "@/lib/auth";

const VALID_ROLES = ["leader", "client"] as const;
type Role = (typeof VALID_ROLES)[number];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, password, name, role } = req.body as {
    email: string; password: string; name: string; role: string;
  };

  if (!email || !password || !name || !VALID_ROLES.includes(role as Role)) {
    return res.status(400).json({ error: "필수 입력값이 누락되었습니다." });
  }

  // user_metadata에 role, name 저장 → auth.users 트리거로 profiles 자동 생성
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role, name },
  });

  if (authError) {
    if (authError.message.includes("already registered") || authError.code === "email_exists") {
      return res.status(409).json({ error: "이미 사용 중인 이메일입니다." });
    }
    return res.status(500).json({ error: authError.message });
  }

  const userId = authData.user.id;

  // 트리거가 없을 경우를 대비한 안전망 — profiles 직접 삽입 (충돌 시 무시)
  await supabaseAdmin
    .from("profiles")
    .upsert({ id: userId, name, email, role }, { onConflict: "id", ignoreDuplicates: true });

  if (role === "leader") {
    await supabaseAdmin
      .from("leader_profiles")
      .upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });
  }

  const { data: session, error: signInError } = await createAuthClient()
    .auth.signInWithPassword({ email, password });

  if (signInError || !session.session) {
    return res.status(500).json({ error: "회원가입 후 로그인에 실패했습니다." });
  }

  setAuthCookie(res, session.session.access_token);
  return res.status(201).json({ id: userId, email, role, name });
}
