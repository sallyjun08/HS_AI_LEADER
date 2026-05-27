import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const { data, error } = await supabaseAdmin
    .from("achievements")
    .select("achieved_at, title, description")
    .eq("is_visible", true)
    .order("sort_order", { ascending: true })
    .order("achieved_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
  return res.status(200).json(data ?? []);
}
