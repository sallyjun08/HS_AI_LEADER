import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const [
    { count: totalLeaders },
    { count: verifiedLeaders },
    { count: completedRequests },
    { data: reportRows },
    { data: leaderRows },
  ] = await Promise.all([
    supabaseAdmin.from("leader_profiles").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabaseAdmin.from("leader_profiles").select("*", { count: "exact", head: true }).eq("is_verified", true).eq("is_active", true),
    supabaseAdmin.from("match_requests").select("*", { count: "exact", head: true }).eq("status", "completed"),
    supabaseAdmin.from("activity_reports").select("match_id, session_index, attendance_count, lecture_date"),
    supabaseAdmin.from("leader_profiles").select("available_regions").eq("is_active", true),
  ]);

  const reports = reportRows ?? [];

  // 총 수강생: match_id별 첫 회차 attendance만 집계
  const sorted = [...reports].sort((a, b) => (a.session_index ?? 0) - (b.session_index ?? 0));
  const matchAttendance = new Map<string, number>();
  for (const r of sorted) {
    if (r.match_id && !matchAttendance.has(r.match_id)) {
      matchAttendance.set(r.match_id, r.attendance_count ?? 0);
    }
  }
  const totalAttendees = [...matchAttendance.values()].reduce((s, v) => s + v, 0);

  // 월별 통계: 최근 6개월
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const monthlyReports: Record<string, { sessions: number; matchIds: Set<string> }> = {};
  reports
    .filter((r) => r.lecture_date && new Date(r.lecture_date) >= sixMonthsAgo)
    .forEach((r) => {
      const key = r.lecture_date.slice(0, 7);
      if (!monthlyReports[key]) monthlyReports[key] = { sessions: 0, matchIds: new Set() };
      monthlyReports[key].sessions += 1;
      if (r.match_id) monthlyReports[key].matchIds.add(r.match_id);
    });

  const monthlyStats = Object.entries(monthlyReports)
    .map(([month, v]) => ({ month, sessions: v.sessions, dispatches: v.matchIds.size }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // 거점 운영 지역: 활동 리더들의 available_regions 합집합
  const regionSet = new Set<string>();
  (leaderRows ?? []).forEach((l) => {
    ((l.available_regions as string[]) ?? []).forEach((r) => regionSet.add(r));
  });
  const regions = Array.from(regionSet).sort();

  res.setHeader("Cache-Control", "public, s-maxage=120, stale-while-revalidate=300");
  return res.status(200).json({
    leaders: { total: totalLeaders ?? 0, verified: verifiedLeaders ?? 0 },
    completedDispatches: completedRequests ?? 0,
    reports: { total: reports.length, totalAttendees },
    monthlyStats,
    regions,
  });
}
