import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin, createAuthClient } from "@/lib/supabase-server";
import { setAuthCookie } from "@/lib/auth";

const VALID_ROLES = ["leader", "client"] as const;
type Role = (typeof VALID_ROLES)[number];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, password, name, role, orgName, orgType } = req.body as {
    email: string; password: string; name: string; role: string;
    orgName?: string; orgType?: string;
  };

  if (!email || !password || !name || !VALID_ROLES.includes(role as Role)) {
    return res.status(400).json({ error: "필수 입력값이 누락되었습니다." });
  }
  if (role === "client" && !orgName?.trim()) {
    return res.status(400).json({ error: "기관명을 입력해 주세요." });
  }

  const origin = req.headers.origin ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:9002";
  const redirectTo = `${origin}/auth/callback`;

  // signUp을 사용해 Supabase가 인증 이메일을 자동 발송하도록 함
  const { data: authData, error: authError } = await createAuthClient().auth.signUp({
    email,
    password,
    options: {
      data: { role, name },
      emailRedirectTo: redirectTo,
    },
  });

  if (authError) {
    if (authError.message.toLowerCase().includes("already registered") || authError.status === 422) {
      return res.status(409).json({ error: "이미 사용 중인 이메일입니다." });
    }
    return res.status(500).json({ error: authError.message });
  }

  const userId = authData.user?.id;
  if (!userId) return res.status(500).json({ error: "회원가입에 실패했습니다." });

  // 이메일 미인증 상태에서도 프로필 미리 생성 (인증 완료 후 바로 사용 가능하도록)
  await supabaseAdmin
    .from("profiles")
    .upsert(
      {
        id: userId, name, email: email.toLowerCase().trim(), role,
        ...(role === "client" ? { org_name: orgName?.trim() ?? null, org_type: orgType?.trim() ?? null } : {}),
      },
      { onConflict: "id", ignoreDuplicates: true }
    );

  if (role === "leader") {
    await supabaseAdmin
      .from("leader_profiles")
      .upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });
  }

  // session이 없으면 이메일 인증 필요, 있으면 자동 인증(개발 환경 등)
  if (!authData.session) {
    return res.status(200).json({ pending: true, email });
  }

  setAuthCookie(res, authData.session.access_token);
  return res.status(201).json({ id: userId, email, role, name });
}
