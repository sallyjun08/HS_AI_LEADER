// Supabase DB 타입 — `supabase gen types typescript` 로 재생성 가능
export type UserRole = "INSTRUCTOR" | "REQUESTER" | "ADMIN";

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface InstructorProfile {
  id: string;
  user_id: string;
  cert_number: string | null;
  is_verified: boolean;
  is_active: boolean;
  specialties: string;
  areas: string;
  bio: string | null;
  phone: string | null;
  public_email: string | null;
  avg_rating: number;
  total_lectures: number;
  /** 강사가 설정한 선호/특화 교육 대상 — 매칭 시 대상 적합도 점수 산정에 사용됨 */
  preferred_audiences: string[] | null;
  created_at: string;
}

export interface RequesterProfile {
  id: string;
  user_id: string;
  org_name: string;
  org_type: string;
  contact_phone: string | null;
  created_at: string;
}

export interface MatchRequest {
  id: string;
  requester_id: string;
  title: string;
  theme: string;
  audience_type: string;
  audience_size: number;
  preferred_date: string;
  location: string;
  notes: string | null;
  /** 강사 매칭 시 강사의 전문 분야와 대조하는 핵심 파라미터로 사용됨 */
  target_audience: string[] | null;
  status: string;
  created_at: string;
}

export interface Match {
  id: string;
  request_id: string;
  instructor_id: string;
  instructor_agreed: boolean;
  requester_agreed: boolean;
  status: string;
  revealed_at: string | null;
  note: string | null;
  created_at: string;
}

export interface ActivityReport {
  id: string;
  match_id: string;
  instructor_id: string;
  lecture_date: string;
  attendees: number;
  summary: string | null;
  avg_rating: number | null;
  submitted_at: string;
}

export interface Review {
  id: string;
  report_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export type Database = {
  public: {
    Tables: {
      profiles:            { Row: Profile;           Insert: Omit<Profile, "created_at">;           Update: Partial<Profile> };
      instructor_profiles: { Row: InstructorProfile; Insert: Omit<InstructorProfile, "id" | "created_at">; Update: Partial<InstructorProfile> };
      requester_profiles:  { Row: RequesterProfile;  Insert: Omit<RequesterProfile, "id" | "created_at">;  Update: Partial<RequesterProfile> };
      match_requests:      { Row: MatchRequest;      Insert: Omit<MatchRequest, "id" | "created_at">;      Update: Partial<MatchRequest> };
      matches:             { Row: Match;             Insert: Omit<Match, "id" | "created_at">;             Update: Partial<Match> };
      activity_reports:    { Row: ActivityReport;    Insert: Omit<ActivityReport, "id" | "submitted_at">;  Update: Partial<ActivityReport> };
      reviews:             { Row: Review;            Insert: Omit<Review, "id" | "created_at">;            Update: Partial<Review> };
    };
  };
};
