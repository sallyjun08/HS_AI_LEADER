import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAuth, type TokenPayload } from "@/lib/auth";

export const config = { api: { bodyParser: { sizeLimit: "10mb" } } };

const BUCKET = "activity-photos";

async function handler(req: NextApiRequest, res: NextApiResponse, user: TokenPayload) {
  if (req.method !== "POST") return res.status(405).end();
  if (user.role !== "leader") return res.status(403).json({ error: "강사만 업로드할 수 있습니다." });

  const { filename, mimeType, data } = req.body as { filename: string; mimeType: string; data: string };

  if (!filename || !mimeType || !data) return res.status(400).json({ error: "필수 필드가 누락되었습니다." });
  if (!mimeType.startsWith("image/")) return res.status(400).json({ error: "이미지 파일만 업로드 가능합니다." });

  const buffer = Buffer.from(data, "base64");
  if (buffer.byteLength > 8 * 1024 * 1024) return res.status(400).json({ error: "파일 크기는 8MB 이하여야 합니다." });

  // 버킷이 없으면 생성 (이미 있으면 에러 무시)
  await supabaseAdmin.storage.createBucket(BUCKET, { public: true }).catch(() => {});

  const ext = filename.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${user.userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: mimeType, upsert: false });

  if (error) return res.status(500).json({ error: error.message });

  const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  return res.status(200).json({ url: urlData.publicUrl });
}

export default requireAuth(handler, ["leader"]);
