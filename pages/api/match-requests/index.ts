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
            id, is_verified, rating_avg, specialties,
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
          id, is_verified, rating_avg, specialties, available_regions, phone,
          profiles!leader_profiles_user_id_fkey(name, email)
        )`)
        .eq("client_id", user.userId)
        .order("created_at", { ascending: false });
      if (error) return res.status(500).json({ error: error.message });

      // 매칭 확정 전: 강사 이름 마스킹 + 연락처 제거
      const masked = (data ?? []).map((r) => {
        if (!r.leader) return r;
        if (r.status === "matched" || r.status === "ongoing" || r.status === "completed") return r;
        const l = r.leader as { profiles?: { name?: string } };
        return { ...r, leader: { ...r.leader, phone: null, profiles: { name: maskName(l.profiles?.name ?? ""), email: null } } };
      });
      return res.status(200).json(masked);
    }

    // leader: 본인에게 배정된 요청
    const { data: lp } = await supabaseAdmin
      .from("leader_profiles").select("id").eq("user_id", user.userId).single();
    if (!lp) return res.status(404).json({ error: "강사 프로필이 없습니다." });

    const { data, error } = await supabaseAdmin
      .from("match_requests")
      .select(`*, client:profiles!match_requests_client_id_fkey(name), lecture_type, session_count, lecture_times`)
      .eq("leader_id", lp.id)
      .order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data ?? []);
  }

  if (req.method === "POST") {
    if (user.role !== "client")
      return res.status(403).json({ error: "수요처만 매칭 요청을 등록할 수 있습니다." });

    const { lectureType, institutionName, contactPhone,
            title, category, targetAudience, participantCount, sessionCount, lectureHours, institutionType,
            startDate, endDate, address, notes, lectureTimes,
            needsVenue, rentalVenueId, rentalStartTime, needsEquipment, rentalEquipmentCount, rentalNotes,
          } = req.body as {
      lectureType?: string | null; institutionName?: string | null; contactPhone?: string | null;
      title: string; category: string;
      /** 강사 매칭 시 강사의 전문 분야와 대조하는 핵심 파라미터로 사용됨 */
      targetAudience?: string[];
      participantCount: number; sessionCount?: number; lectureHours?: number; institutionType?: string;
      startDate: string; endDate?: string; address?: string;
      notes?: string; lectureTimes?: object[];
      needsVenue?: boolean; rentalVenueId?: string | null; rentalStartTime?: string | null;
      needsEquipment?: boolean; rentalEquipmentCount?: number; rentalNotes?: string | null;
    };

    if (!title || !category || !participantCount || !startDate) {
      return res.status(400).json({ error: "필수 입력값이 누락되었습니다." });
    }

    // 공간 대여 시 시작 시간 필수
    if (needsVenue && rentalVenueId && !rentalStartTime) {
      return res.status(400).json({ error: "공간 대여 시 시작 시간을 입력해 주세요." });
    }

    // 시간대 중복 예약 체크 (회차별 전체 검사)
    if (needsVenue && rentalVenueId && rentalStartTime) {
      const hours = Number(lectureHours) >= 0.5 ? Number(lectureHours) : 2;
      const { data: existing } = await supabaseAdmin
        .from("match_requests")
        .select("id, start_date, rental_start_time, lecture_hours, lecture_times")
        .eq("needs_venue", true)
        .eq("rental_venue_id", rentalVenueId)
        .not("status", "in", `("cancelled","rejected")`);

      if (existing && existing.length > 0) {
        const sessions: { date: string; start: string }[] =
          Array.isArray(lectureTimes) && lectureTimes.length > 0
            ? (lectureTimes as { date: string; start: string }[]).filter((s) => s.date && s.start)
            : [{ date: startDate, start: rentalStartTime }];

        for (const session of sessions) {
          const reqStart = timeToMins(session.start);
          const reqEnd   = reqStart + hours * 60;
          const conflict = existing.find((e) => {
            const exHours = (Number(e.lecture_hours) || 2);
            // check multi-session bookings
            if (Array.isArray(e.lecture_times) && e.lecture_times.length > 0) {
              return (e.lecture_times as { date: string; start: string }[]).some((lt) => {
                if (!lt.date || !lt.start || lt.date !== session.date) return false;
                const exStart = timeToMins(lt.start);
                return reqStart < exStart + exHours * 60 && reqEnd > exStart;
              });
            }
            // check single-session bookings
            if (!e.rental_start_time || (e.start_date as string) !== session.date) return false;
            const exStart = timeToMins(e.rental_start_time as string);
            return reqStart < exStart + exHours * 60 && reqEnd > exStart;
          });
          if (conflict) {
            return res.status(409).json({
              error: "해당 날짜·시간에 이미 예약된 공간입니다. 다른 시간대를 선택해 주세요.",
            });
          }
        }
      }
    }

    const { data, error } = await supabaseAdmin
      .from("match_requests")
      .insert({
        client_id: user.userId,
        lecture_type: lectureType ?? null,
        institution_name: institutionName ?? null,
        contact_phone: contactPhone ?? null,
        title, category,
        target_audience: Array.isArray(targetAudience) ? targetAudience : [],
        participant_count: Number(participantCount),
        session_count: Number(sessionCount) >= 1 ? Number(sessionCount) : 1,
        lecture_hours: Number(lectureHours) >= 0.5 ? Number(lectureHours) : 2,
        institution_type: institutionType,
        start_date: startDate,
        end_date: endDate ?? null,
        address: address ?? null,
        notes: notes ?? null,
        lecture_times: lectureTimes ?? [],
        needs_venue: needsVenue ?? false,
        rental_venue_id: rentalVenueId ?? null,
        rental_start_time: (needsVenue && rentalStartTime) ? rentalStartTime : null,
        needs_equipment: needsEquipment ?? false,
        rental_equipment_count: Number(rentalEquipmentCount) >= 0 ? Number(rentalEquipmentCount) : 0,
        rental_notes: rentalNotes ?? null,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  return res.status(405).end();
}

function timeToMins(t: string): number {
  const parts = t.split(":");
  return Number(parts[0]) * 60 + Number(parts[1]);
}

function maskName(name: string): string {
  if (name.length <= 1) return "*";
  if (name.length === 2) return name[0] + "*";
  return name[0] + "*".repeat(name.length - 2) + name[name.length - 1];
}

export default requireAuth(handler);
