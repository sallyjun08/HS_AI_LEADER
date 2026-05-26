import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAuth, type TokenPayload } from "@/lib/auth";

const TEST_CLIENT_EMAIL = "client@test.aitda";
const TEST_CLIENT_PASSWORD = "Test1234!";

async function handler(req: NextApiRequest, res: NextApiResponse, _user: TokenPayload) {
  if (req.method === "POST") {
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("email", TEST_CLIENT_EMAIL)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: "이미 존재하는 테스트 계정입니다.", email: TEST_CLIENT_EMAIL });
    }

    const { data: au, error: auErr } = await supabaseAdmin.auth.admin.createUser({
      email: TEST_CLIENT_EMAIL,
      password: TEST_CLIENT_PASSWORD,
      email_confirm: true,
      user_metadata: { role: "client", name: "테스트 수요처" },
    });
    if (auErr) return res.status(500).json({ error: auErr.message });

    await supabaseAdmin.from("profiles").upsert(
      { id: au.user.id, name: "테스트 수요처", email: TEST_CLIENT_EMAIL, role: "client" },
      { onConflict: "id", ignoreDuplicates: true }
    );

    return res.status(201).json({
      message: "테스트 수요처 계정 생성 완료",
      email: TEST_CLIENT_EMAIL,
      password: TEST_CLIENT_PASSWORD,
    });
  }

  if (req.method === "DELETE") {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", TEST_CLIENT_EMAIL)
      .maybeSingle();

    if (!profile) return res.status(404).json({ error: "테스트 계정이 없습니다." });

    await supabaseAdmin.from("match_requests").delete().eq("client_id", profile.id);
    await supabaseAdmin.auth.admin.deleteUser(profile.id);

    return res.status(200).json({ message: "테스트 수요처 계정 및 요청 삭제 완료" });
  }

  return res.status(405).end();
}

export default requireAuth(handler, ["admin"]);
