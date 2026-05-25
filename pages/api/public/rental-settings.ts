import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const { data, error } = await supabaseAdmin
    .from("rental_settings")
    .select("*")
    .order("type")
    .order("name");

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data ?? []);
}
