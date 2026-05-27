import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAuth, type TokenPayload } from "@/lib/auth";

// GET /api/admin/settlement/instructor-fees
// 강의 완료(status=completed) 기준 — 매칭 단위로 강사료 정산 목록 반환

async function handler(req: NextApiRequest, res: NextApiResponse, _user: TokenPayload) {
  if (req.method !== "GET") return res.status(405).end();

  // 1. 완료된 매칭 조회
  const { data: completedMatches, error: matchErr } = await supabaseAdmin
    .from("match_requests")
    .select(`
      id, title, category, address, location_type, frequency,
      lecture_type, session_count, lecture_hours,
      leader:leader_profiles!match_requests_leader_id_fkey(
        id,
        profiles!leader_profiles_user_id_fkey(name, email)
      ),
      client:profiles!match_requests_client_id_fkey(name, email)
    `)
    .eq("status", "completed");

  if (matchErr) return res.status(500).json({ error: matchErr.message });
  if (!completedMatches?.length) return res.status(200).json([]);

  const matchIds = completedMatches.map((m) => m.id);

  // 2. 해당 매칭들의 전체 보고서 조회 (합계 및 최종 보고서 탐색용)
  const { data: allReports, error: reportErr } = await supabaseAdmin
    .from("activity_reports")
    .select(`
      id, match_id, session_index, attendance_count, lecture_date, submitted_at,
      admin_approved_at, admin_note, report_text, image_urls,
      rating_from_client, instructor_fee, instructor_fee_paid_at
    `)
    .in("match_id", matchIds);

  if (reportErr) return res.status(500).json({ error: reportErr.message });

  // 3. 매칭별 보고서 그룹화
  const reportsByMatch = new Map<string, NonNullable<typeof allReports>>();
  for (const r of allReports ?? []) {
    const arr = reportsByMatch.get(r.match_id) ?? [];
    arr.push(r);
    reportsByMatch.set(r.match_id, arr);
  }

  // 4. 매칭별 정산 항목 생성 (최종 보고서 기반 + 전체 집계)
  const result = completedMatches
    .map((match) => {
      const reports     = reportsByMatch.get(match.id) ?? [];
      const finalReport = reports.find((r) => r.admin_approved_at !== null);
      if (!finalReport) return null; // 최종 승인 보고서 없는 경우 제외

      const totalAttendance = reports.reduce((s, r) => s + (r.attendance_count ?? 0), 0);
      const totalSessions   = reports.length;

      return {
        id:                     finalReport.id,
        lecture_date:           finalReport.lecture_date,
        submitted_at:           finalReport.submitted_at,
        admin_approved_at:      finalReport.admin_approved_at,
        admin_note:             finalReport.admin_note,
        report_text:            finalReport.report_text,
        image_urls:             finalReport.image_urls ?? [],
        rating_from_client:     finalReport.rating_from_client,
        instructor_fee:         finalReport.instructor_fee ?? 0,
        instructor_fee_paid_at: finalReport.instructor_fee_paid_at,
        total_attendance:       totalAttendance,
        total_sessions:         totalSessions,
        match,
      };
    })
    .filter(Boolean);

  return res.status(200).json(result);
}

export default requireAuth(handler, ["admin"]);
