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
    certLevel: number;
    isVerified: boolean;
    isActive: boolean;
    specialties: string[];
    availableRegions: string[];
    availableTimes: { weekdays?: string[]; time_slots?: string[] } | null;
    ratingAvg: number;
    totalLectures: number;
    maxClassesMonth: number;
  } | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
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
    try {
      const res = await fetch("/api/auth/me");
      if (!res.ok) { setUser(null); return; }
      setUser(await res.json());
    } catch {
      setUser(null);
    }
  }

  useEffect(() => {
    fetchMe().finally(() => setLoading(false));
  }, []);

  async function signIn(email: string, password: string) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json();
      return { error: data.error ?? "로그인에 실패했습니다." };
    }
    await fetchMe();
    const me = await fetch("/api/auth/me").then((r) => r.json()).catch(() => null);
    if (me?.role) router.replace(ROLE_REDIRECTS[me.role as UserRole]);
    return { error: null };
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
