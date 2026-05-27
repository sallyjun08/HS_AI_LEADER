import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";

export const config = { api: { bodyParser: { sizeLimit: "10mb" } } };

const BUCKET = "certificates";
const MAX_BYTES = 8 * 1024 * 1024;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { filename, mimeType, data } = req.body as {
    filename?: string;
    mimeType?: string;
    data?: string;
  };

  if (!filename || !mimeType || !data)
    return res.status(400).json({ error: "필수 필드가 누락되었습니다." });
  if (!mimeType.startsWith("image/"))
    return res.status(400).json({ error: "이미지 파일만 업로드 가능합니다." });

  const buffer = Buffer.from(data, "base64");
  if (buffer.byteLength > MAX_BYTES)
    return res.status(400).json({ error: "파일 크기는 8MB 이하여야 합니다." });

  const { error: bucketError } = await supabaseAdmin.storage.createBucket(BUCKET, { public: true });
  if (bucketError && !bucketError.message.includes("already exists")) {
    console.error("[upload-cert] createBucket error:", bucketError.message);
    return res.status(500).json({ error: `스토리지 버킷 초기화 실패: ${bucketError.message}` });
  }

  const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `pending/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: mimeType, upsert: false });

  if (error) {
    console.error("[upload-cert] upload error:", error.message);
    return res.status(500).json({ error: error.message });
  }

  const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  return res.status(200).json({ url: urlData.publicUrl });
}
