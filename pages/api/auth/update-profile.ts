import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAuth, type TokenPayload } from "@/lib/auth";

async function handler(req: NextApiRequest, res: NextApiResponse, user: TokenPayload) {
  if (req.method !== "PATCH") return res.status(405).end();

  const { name, orgName, orgType, specialties, availableRegions } = req.body as {
    name?: string;
    orgName?: string;
    orgType?: string;
    specialties?: string[];
    availableRegions?: string[];
  };

  if (name !== undefined) {
    if (!name.trim()) return res.status(400).json({ error: "이름을 입력해 주세요." });

    await supabaseAdmin.from("profiles").update({ name: name.trim() }).eq("id", user.userId);
    await supabaseAdmin.auth.admin.updateUserById(user.userId, {
      user_metadata: { name: name.trim() },
    });
  }

  if (user.role === "client") {
    const updates: Record<string, string | null> = {};
    if (orgName !== undefined) updates.org_name = orgName.trim() || null;
    if (orgType !== undefined) updates.org_type = orgType.trim() || null;
    if (Object.keys(updates).length > 0) {
      await supabaseAdmin.from("profiles").update(updates).eq("id", user.userId);
    }
  }

  if (user.role === "leader") {
    const updates: Record<string, unknown> = {};
    if (Array.isArray(specialties)) updates.specialties = specialties;
    if (Array.isArray(availableRegions)) updates.available_regions = availableRegions;
    if (Object.keys(updates).length > 0) {
      await supabaseAdmin.from("leader_profiles").update(updates).eq("user_id", user.userId);
    }
  }

  return res.status(200).json({ ok: true });
}

export default requireAuth(handler);
