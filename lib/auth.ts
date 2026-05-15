import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "./supabase-server";

const COOKIE_NAME = "aitda_token";
const MAX_AGE = 60 * 60 * 24 * 7;

export type UserRole = "leader" | "client" | "admin";
export type TokenPayload = { userId: string; email: string; role: UserRole; name: string };

export function setAuthCookie(res: NextApiResponse, token: string) {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax`
  );
}

export function clearAuthCookie(res: NextApiResponse) {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`);
}

export async function getUserFromRequest(req: NextApiRequest): Promise<TokenPayload | null> {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role, name")
    .eq("id", data.user.id)
    .single();

  if (!profile) return null;

  return {
    userId: data.user.id,
    email: data.user.email ?? "",
    role: profile.role as UserRole,
    name: profile.name as string,
  };
}

export function requireAuth(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (req: NextApiRequest, res: NextApiResponse, user: TokenPayload) => Promise<any>,
  allowedRoles?: UserRole[]
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: "로그인이 필요합니다." });
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: "권한이 없습니다." });
    }
    return handler(req, res, user);
  };
}
