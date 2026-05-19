import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAuth, type TokenPayload } from "@/lib/auth";

// Supabase Storage 버킷 이름 — 대시보드에서 Public 버킷으로 생성 필요
const BUCKET = "activity-reports";

async function handler(req: NextApiRequest, res: NextApiResponse, user: TokenPayload) {
  if (req.method !== "POST") return res.status(405).end();
  if (user.role !== "leader") return res.status(403).json({ error: "강사만 업로드할 수 있습니다." });

  const { filename, contentType } = req.body as { filename?: string; contentType?: string };
  if (!filename || !contentType) return res.status(400).json({ error: "filename, contentType 필수" });
  if (!contentType.startsWith("image/")) return res.status(400).json({ error: "이미지 파일만 업로드할 수 있습니다." });

  const { data: lp } = await supabaseAdmin
    .from("leader_profiles").select("id").eq("user_id", user.userId).maybeSingle();
  if (!lp) return res.status(404).json({ error: "강사 프로필이 없습니다." });

  const ext = filename.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${lp.id}/${Date.now()}.${ext}`;

  const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return res.status(500).json({ error: error?.message ?? "업로드 URL 생성 실패" });

  const publicUrl = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  return res.status(200).json({ signedUrl: data.signedUrl, path, publicUrl });
}

export default requireAuth(handler, ["leader"]);
