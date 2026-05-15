import Head from "next/head";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/router";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // URL 해시에서 access_token 추출 (Supabase 복구 링크 형식)
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const token = params.get("access_token");
    const type = params.get("type");

    if (!token || type !== "recovery") {
      setError("유효하지 않은 링크입니다. 비밀번호 찾기를 다시 요청해 주세요.");
      return;
    }
    setAccessToken(token);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) return setError("비밀번호가 일치하지 않습니다.");
    if (password.length < 6) return setError("비밀번호는 6자 이상이어야 합니다.");

    setError(null);
    setSubmitting(true);

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, password }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "비밀번호 변경에 실패했습니다.");
      return;
    }

    setDone(true);
    setTimeout(() => router.replace("/login"), 3000);
  }

  return (
    <>
      <Head>
        <title>비밀번호 재설정 — 화성 AI 시민리더 잇다(IT-DA)</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-[#001845] via-[#003087] to-[#00419e] flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <span className="text-hwaseong-blue font-extrabold text-[8px] leading-tight text-center">AI<br />잇다</span>
              </div>
              <div className="text-left">
                <p className="text-blue-200 text-xs">화성시 AI 시민리더 매칭 플랫폼</p>
                <p className="text-white font-bold text-base">화성 AI 시민리더 잇다(IT-DA)</p>
              </div>
            </Link>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl p-8">
            {done ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 className="text-xl font-black text-hwaseong-text mb-2">비밀번호가 변경되었습니다</h1>
                <p className="text-sm text-gray-500">잠시 후 로그인 페이지로 이동합니다...</p>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-black text-hwaseong-text mb-1">새 비밀번호 설정</h1>
                <p className="text-sm text-gray-500 mb-8">사용할 새 비밀번호를 입력해 주세요.</p>

                {error && !accessToken ? (
                  <div className="space-y-4">
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                      {error}
                    </div>
                    <Link
                      href="/forgot-password"
                      className="block w-full py-3 bg-hwaseong-blue text-white text-sm font-bold rounded-xl hover:bg-blue-900 transition-colors text-center"
                    >
                      비밀번호 찾기 다시 요청
                    </Link>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">새 비밀번호</label>
                      <input
                        type="password" value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="6자 이상" required autoComplete="new-password"
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30 focus:border-hwaseong-blue transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">비밀번호 확인</label>
                      <input
                        type="password" value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        placeholder="비밀번호를 다시 입력하세요" required autoComplete="new-password"
                        className={`w-full px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-colors ${
                          confirm && password !== confirm
                            ? "border-red-300 focus:ring-red-200 focus:border-red-400"
                            : "border-gray-200 focus:ring-hwaseong-blue/30 focus:border-hwaseong-blue"
                        }`}
                      />
                      {confirm && password !== confirm && (
                        <p className="text-xs text-red-500 mt-1">비밀번호가 일치하지 않습니다.</p>
                      )}
                    </div>

                    {error && (
                      <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting || !accessToken || (!!confirm && password !== confirm)}
                      className="w-full py-3.5 bg-hwaseong-blue hover:bg-blue-900 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition-colors shadow-md"
                    >
                      {submitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          변경 중...
                        </span>
                      ) : "비밀번호 변경하기"}
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
