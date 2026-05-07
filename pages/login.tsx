import Head from "next/head";
import Link from "next/link";
import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/lib/auth-context";
import type { UserRole } from "@/types/database";

const ROLE_REDIRECTS: Record<UserRole, string> = {
  learner: "/dashboard/learner",
  instructor: "/dashboard/instructor",
  operator: "/dashboard/operator",
};

const ERROR_MESSAGES: Record<string, string> = {
  "Invalid login credentials": "이메일 또는 비밀번호가 올바르지 않습니다.",
  "Email not confirmed": "이메일 인증이 필요합니다. 수신함을 확인해 주세요.",
};

export default function LoginPage() {
  const { signIn, user, profile, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user && profile) {
      router.replace(ROLE_REDIRECTS[profile.role]);
    }
  }, [loading, user, profile, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: err } = await signIn(email, password);
    if (err) {
      setError(ERROR_MESSAGES[err] ?? err);
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#eef3f9] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-hwaseong-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>로그인 — 화성 AI 리더 허브</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-[#001845] via-[#003087] to-[#00419e] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <span className="text-hwaseong-blue font-bold text-[10px] leading-tight text-center">
                  화성
                  <br />시
                </span>
              </div>
              <div className="text-left">
                <p className="text-blue-200 text-xs">Hwaseong Special City</p>
                <p className="text-white font-bold text-lg">화성 AI 리더 허브</p>
              </div>
            </Link>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h1 className="text-2xl font-bold text-hwaseong-text mb-1">로그인</h1>
            <p className="text-sm text-gray-500 mb-8">
              계정 정보를 입력하여 대시보드에 접속하세요.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-gray-700 mb-1.5"
                >
                  이메일
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  required
                  autoComplete="email"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30 focus:border-hwaseong-blue transition-colors placeholder-gray-300"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-gray-700 mb-1.5"
                >
                  비밀번호
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30 focus:border-hwaseong-blue transition-colors placeholder-gray-300"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-start gap-2">
                  <svg
                    className="w-4 h-4 mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-hwaseong-blue hover:bg-blue-900 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition-colors shadow-md"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    로그인 중...
                  </span>
                ) : (
                  "로그인"
                )}
              </button>
            </form>

            {/* Role guide */}
            <div className="mt-6 p-4 bg-[#eef3f9] rounded-xl space-y-2">
              <p className="text-xs font-semibold text-gray-500 mb-2">역할별 대시보드 안내</p>
              {[
                { icon: "🎓", label: "피교육자", desc: "학습 현황 및 과정 신청" },
                { icon: "🏅", label: "AI 시민 리더", desc: "강의 일정 및 활동 기록" },
                { icon: "⚙️", label: "운영자", desc: "매칭 관제 및 전체 통계" },
              ].map((r) => (
                <div key={r.label} className="flex items-center gap-2.5 text-xs text-gray-600">
                  <span className="text-base w-5 text-center">{r.icon}</span>
                  <span className="font-semibold text-hwaseong-blue w-20">{r.label}</span>
                  <span className="text-gray-400">{r.desc}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <Link
                href="/"
                className="text-sm text-gray-400 hover:text-hwaseong-blue transition-colors"
              >
                ← 메인 페이지로 돌아가기
              </Link>
            </div>
          </div>

          <p className="text-center text-blue-200/50 text-xs mt-6">
            화성특례시 AI 혁신학교 AI랩 © 2026
          </p>
        </div>
      </div>
    </>
  );
}
