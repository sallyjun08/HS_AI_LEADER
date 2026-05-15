import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";
import { requireAuth, type TokenPayload } from "@/lib/auth";

async function handler(req: NextApiRequest, res: NextApiResponse, _user: TokenPayload) {
  if (req.method !== "GET") return res.status(405).end();

  const [
    { count: totalLeaders },
    { count: verifiedLeaders },
    { count: totalRequests },
    { count: pendingRequests },
    { count: matchedRequests },
    { count: completedRequests },
    { count: totalReports },
    { data: reportRows },
  ] = await Promise.all([
    supabaseAdmin.from("leader_profiles").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("leader_profiles").select("*", { count: "exact", head: true }).eq("is_verified", true),
    supabaseAdmin.from("match_requests").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("match_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabaseAdmin.from("match_requests").select("*", { count: "exact", head: true }).in("status", ["matched", "ongoing"]),
    supabaseAdmin.from("match_requests").select("*", { count: "exact", head: true }).eq("status", "completed"),
    supabaseAdmin.from("activity_reports").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("activity_reports").select("attendance_count, rating_from_client, lecture_date"),
  ]);

  const reports = reportRows ?? [];
  const totalAttendees = reports.reduce((s, r) => s + (r.attendance_count ?? 0), 0);
  const ratedReports = reports.filter((r) => r.rating_from_client !== null);
  const avgSatisfaction =
    ratedReports.length > 0
      ? Math.round(
          (ratedReports.reduce((s, r) => s + (r.rating_from_client ?? 0), 0) / ratedReports.length) * 10
        ) / 10
      : 0;

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const monthlyMap: Record<string, number> = {};
  reports
    .filter((r) => r.lecture_date && new Date(r.lecture_date) >= sixMonthsAgo)
    .forEach((r) => {
      const key = r.lecture_date.slice(0, 7);
      monthlyMap[key] = (monthlyMap[key] ?? 0) + 1;
    });
  const monthlyStats = Object.entries(monthlyMap)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return res.status(200).json({
    leaders: { total: totalLeaders ?? 0, verified: verifiedLeaders ?? 0 },
    requests: {
      total: totalRequests ?? 0,
      pending: pendingRequests ?? 0,
      matched: matchedRequests ?? 0,
      completed: completedRequests ?? 0,
    },
    reports: { total: totalReports ?? 0, totalAttendees, avgSatisfaction },
    monthlyStats,
  });
}

export default requireAuth(handler, ["admin"]);
