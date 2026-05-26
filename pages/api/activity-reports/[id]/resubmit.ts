import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAuth, type TokenPayload } from "@/lib/auth";

// PATCH /api/activity-reports/:id/resubmit — 강사가 반려된 보고서 재작성

async function handler(req: NextApiRequest, res: NextApiResponse, user: TokenPayload) {
  if (req.method !== "PATCH") return res.status(405).end();
  if (user.role !== "leader") return res.status(403).json({ error: "강사만 보고서를 재작성할 수 있습니다." });

  const { id } = req.query as { id: string };
  const { lectureDate, lectureDates, attendeeCount, reportText, imageUrls } = req.body as {
    lectureDate?: string;
    lectureDates?: string[];
    attendeeCount: number;
    reportText?: string;
    imageUrls?: string[];
  };

  const resolvedLectureDate = lectureDate ?? lectureDates?.[0] ?? null;
  if (!resolvedLectureDate || !attendeeCount) {
    return res.status(400).json({ error: "필수 입력값이 누락되었습니다." });
  }

  const { data: lp } = await supabaseAdmin
    .from("leader_profiles").select("id").eq("user_id", user.userId).single();
  if (!lp) return res.status(400).json({ error: "강사 프로필이 없습니다." });

  const { data: report } = await supabaseAdmin
    .from("activity_reports")
    .select("id, instructor_id, client_rejected_at, client_rejection_reason, rejection_history")
    .eq("id", id)
    .single();

  if (!report) return res.status(404).json({ error: "보고서를 찾을 수 없습니다." });
  if (report.instructor_id !== lp.id) return res.status(403).json({ error: "이 보고서에 대한 권한이 없습니다." });
  if (!report.client_rejected_at) return res.status(400).json({ error: "반려된 보고서만 재작성할 수 있습니다." });

  const normalizedDates = Array.isArray(lectureDates) && lectureDates.length > 0
    ? lectureDates.filter(Boolean)
    : [];

  // 반려 이력을 history 배열에 보존
  const prevHistory: unknown[] = Array.isArray(report.rejection_history) ? report.rejection_history : [];
  const updatedHistory = [
    ...prevHistory,
    {
      rejected_at:    report.client_rejected_at,
      reason:         report.client_rejection_reason,
      resubmitted_at: new Date().toISOString(),
    },
  ];

  const { data: updated, error } = await supabaseAdmin
    .from("activity_reports")
    .update({
      lecture_date:            resolvedLectureDate,
      lecture_dates:           normalizedDates,
      attendance_count:        Number(attendeeCount),
      report_text:             reportText?.trim() ?? null,
      image_urls:              Array.isArray(imageUrls) ? imageUrls.slice(0, 3) : [],
      rejection_history:       updatedHistory,
      client_rejected_at:      null,
      client_rejection_reason: null,
      admin_approved_at:       null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json(updated);
}

export default requireAuth(handler);
