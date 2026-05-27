import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";

const BUCKET = "certificates";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { filename, mimeType } = req.body as { filename?: string; mimeType?: string };
  if (!filename || !mimeType) return res.status(400).json({ error: "필수 필드가 누락되었습니다." });
  if (!mimeType.startsWith("image/")) return res.status(400).json({ error: "이미지 파일만 업로드 가능합니다." });

  const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `pending/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return res.status(500).json({ error: error?.message ?? "업로드 URL 생성 실패" });

  const publicUrl = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  return res.status(200).json({ signedUrl: data.signedUrl, publicUrl });
}
