export type UserRole = "learner" | "instructor" | "operator";
export type CourseStatus = "recruiting" | "ongoing" | "closed" | "upcoming";
export type MatchStatus = "pending" | "matched" | "completed" | "cancelled";

export interface Profile {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  avatar_url?: string;
  bio?: string;
  completed_steps: number[];
  created_at: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  stage: 1 | 2 | 3;
  status: CourseStatus;
  instructor_id?: string;
  instructor_name?: string;
  schedule: string;
  duration: string;
  capacity: number;
  enrolled: number;
  location: string;
  cert: string;
  tags: string[];
}

export interface Application {
  id: string;
  course_id: string;
  user_id: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export interface MatchRequest {
  id: string;
  requester_id: string;
  requester_name: string;
  requester_org: string;
  theme: string;
  preferred_date: string;
  audience_size: number;
  location: string;
  status: MatchStatus;
  instructor_id?: string;
  instructor_name?: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  instructor_id: string;
  title: string;
  date: string;
  audience_count: number;
  location: string;
  rating: number;
}

// Supabase DB type stub — replace with generated types after `supabase gen types`
export type Database = {
  public: {
    Tables: {
      profiles:      { Row: Profile;      Insert: Omit<Profile, "id" | "created_at">;      Update: Partial<Profile> };
      courses:       { Row: Course;       Insert: Omit<Course, "id">;                       Update: Partial<Course> };
      applications:  { Row: Application;  Insert: Omit<Application, "id" | "created_at">;   Update: Partial<Application> };
      match_requests:{ Row: MatchRequest; Insert: Omit<MatchRequest, "id" | "created_at">; Update: Partial<MatchRequest> };
      activity_logs: { Row: ActivityLog;  Insert: Omit<ActivityLog, "id">;                  Update: Partial<ActivityLog> };
    };
  };
};
