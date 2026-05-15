import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAuth, type TokenPayload } from "@/lib/auth";

async function handler(req: NextApiRequest, res: NextApiResponse, user: TokenPayload) {
  if (req.method === "GET") {
    if (user.role === "admin") {
      const { data, error } = await supabaseAdmin
        .from("activity_reports")
        .select(`*, match:match_requests!activity_reports_match_id_fkey(
          title, address, start_date,
          leader:leader_profiles!match_requests_leader_id_fkey(
            profiles!leader_profiles_user_id_fkey(name)
          )
        )`)
        .order("submitted_at", { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data ?? []);
    }

    if (user.role === "leader") {
      const { data: lp } = await supabaseAdmin
        .from("leader_profiles").select("id").eq("user_id", user.userId).single();
      if (!lp) return res.status(404).json({ error: "강사 프로필이 없습니다." });

      const { data, error } = await supabaseAdmin
        .from("activity_reports")
        .select(`*, match:match_requests!activity_reports_match_id_fkey(title, address, start_date)`)
        .eq("instructor_id", lp.id)
        .order("submitted_at", { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json(data ?? []);
    }

    // client: 본인 요청의 보고서
    const { data, error } = await supabaseAdmin
      .from("activity_reports")
      .select(`*, match:match_requests!activity_reports_match_id_fkey(title, address, start_date, client_id)`)
      .eq("match.client_id", user.userId)
      .order("submitted_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data ?? []);
  }

  if (req.method === "POST") {
    if (user.role !== "leader")
      return res.status(403).json({ error: "강사만 활동 보고서를 제출할 수 있습니다." });

    const { matchId, lectureDate, attendeeCount, reportText } = req.body as {
      matchId: string; lectureDate: string; attendeeCount: number; reportText?: string;
    };

    if (!matchId || !lectureDate || !attendeeCount) {
      return res.status(400).json({ error: "필수 입력값이 누락되었습니다." });
    }

    const { data: lp } = await supabaseAdmin
      .from("leader_profiles").select("id").eq("user_id", user.userId).single();
    if (!lp) return res.status(400).json({ error: "강사 프로필이 없습니다." });

    const { data: mr } = await supabaseAdmin
      .from("match_requests")
      .select("id, status, leader_id")
      .eq("id", matchId)
      .single();

    if (!mr || mr.leader_id !== lp.id)
      return res.status(403).json({ error: "이 매칭에 대한 권한이 없습니다." });
    if (!["matched", "ongoing"].includes(mr.status))
      return res.status(400).json({ error: "배정된 매칭만 보고서를 제출할 수 있습니다." });

    const { data: existing } = await supabaseAdmin
      .from("activity_reports").select("id").eq("match_id", matchId).maybeSingle();
    if (existing) return res.status(409).json({ error: "이미 제출된 보고서가 있습니다." });

    const { data: report, error } = await supabaseAdmin
      .from("activity_reports")
      .insert({ match_id: matchId, instructor_id: lp.id, lecture_date: lectureDate, attendance_count: Number(attendeeCount), report_text: reportText })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    await Promise.all([
      supabaseAdmin.from("match_requests").update({ status: "completed" }).eq("id", matchId),
      supabaseAdmin.rpc("increment_lecture_count", { p_leader_id: lp.id }),
    ]);

    return res.status(201).json(report);
  }

  return res.status(405).end();
}

export default requireAuth(handler);
