import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/router";

export type UserRole = "leader" | "client" | "admin";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  leaderProfile?: {
    id: string;
    isVerified: boolean;
    isActive: boolean;
    specialties: string[];
    availableRegions: string[];
    availableTimes: { weekdays?: string[]; time_slots?: string[] } | null;
    ratingAvg: number;
    totalLectures: number;
    maxClassesMonth: number;
    /** 강사가 설정한 선호/특화 교육 대상 — 매칭 시 대상 적합도 점수 산정에 사용됨 */
    preferredAudiences: string[];
  } | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string, role?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const ROLE_REDIRECTS: Record<UserRole, string> = {
  leader: "/dashboard/leader",
  client: "/dashboard/client",
  admin: "/dashboard/admin",
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function fetchMe() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch("/api/auth/me", { signal: controller.signal, cache: "no-store" });
      if (res.status === 401) { setUser(null); return; }
      if (!res.ok) return;
      const data = await res.json();
      setUser(data);
    } catch {
      // 네트워크 오류 시 기존 세션 유지
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMe();
  }, []);

  async function signIn(email: string, password: string, role?: string) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { error: (data as { error?: string }).error ?? "로그인에 실패했습니다." };
      }
      await fetchMe();
      return { error: null };
    } catch (e) {
      clearTimeout(timer);
      const isTimeout = e instanceof DOMException && e.name === "AbortError";
      return { error: isTimeout ? "요청 시간이 초과되었습니다. 다시 시도해 주세요." : "로그인 중 서버 연결 오류가 발생했습니다." };
    }
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.replace("/login");
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, refresh: fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { ROLE_REDIRECTS };
