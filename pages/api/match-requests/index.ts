import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAuth, type TokenPayload } from "@/lib/auth";

async function handler(req: NextApiRequest, res: NextApiResponse, user: TokenPayload) {
  if (req.method === "GET") {
    if (user.role === "admin") {
      const { data, error } = await supabaseAdmin
        .from("match_requests")
        .select(`*, client:profiles!match_requests_client_id_fkey(name),
          leader:leader_profiles!match_requests_leader_id_fkey(
            id, cert_level, is_verified, rating_avg, specialties,
            profiles!leader_profiles_user_id_fkey(name)
          )`)
        .order("created_at", { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data ?? []);
    }

    if (user.role === "client") {
      const { data, error } = await supabaseAdmin
        .from("match_requests")
        .select(`*, leader:leader_profiles!match_requests_leader_id_fkey(
          id, cert_level, is_verified, rating_avg, specialties, available_regions,
          profiles!leader_profiles_user_id_fkey(name)
        )`)
        .eq("client_id", user.userId)
        .order("created_at", { ascending: false });
      if (error) return res.status(500).json({ error: error.message });

      // 매칭 확정 전 강사 이름 마스킹
      const masked = (data ?? []).map((r) => {
        if (!r.leader) return r;
        if (r.status === "matched" || r.status === "ongoing" || r.status === "completed") return r;
        const l = r.leader as { profiles?: { name?: string } };
        return { ...r, leader: { ...r.leader, profiles: { name: maskName(l.profiles?.name ?? "") } } };
      });
      return res.status(200).json(masked);
    }

    // leader: 본인에게 배정된 요청
    const { data: lp } = await supabaseAdmin
      .from("leader_profiles").select("id").eq("user_id", user.userId).single();
    if (!lp) return res.status(404).json({ error: "강사 프로필이 없습니다." });

    const { data, error } = await supabaseAdmin
      .from("match_requests")
      .select(`*, client:profiles!match_requests_client_id_fkey(name)`)
      .eq("leader_id", lp.id)
      .order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data ?? []);
  }

  if (req.method === "POST") {
    if (user.role !== "client")
      return res.status(403).json({ error: "수요처만 매칭 요청을 등록할 수 있습니다." });

    const { title, category, targetAge, participantCount, institutionType,
            startDate, endDate, address, notes, lectureTimes } = req.body as {
      title: string; category: string; targetAge?: string;
      participantCount: number; institutionType?: string;
      startDate: string; endDate?: string; address?: string;
      notes?: string; lectureTimes?: object[];
    };

    if (!title || !category || !participantCount || !startDate) {
      return res.status(400).json({ error: "필수 입력값이 누락되었습니다." });
    }

    const { data, error } = await supabaseAdmin
      .from("match_requests")
      .insert({
        client_id: user.userId,
        title, category,
        target_age: targetAge,
        participant_count: Number(participantCount),
        institution_type: institutionType,
        start_date: startDate,
        end_date: endDate ?? null,
        address: address ?? null,
        notes: notes ?? null,
        lecture_times: lectureTimes ?? [],
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  return res.status(405).end();
}

function maskName(name: string): string {
  if (name.length <= 1) return "*";
  if (name.length === 2) return name[0] + "*";
  return name[0] + "*".repeat(name.length - 2) + name[name.length - 1];
}

export default requireAuth(handler);
