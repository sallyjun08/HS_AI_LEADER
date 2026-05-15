import Head from "next/head";
import Link from "next/link";
import { useState, type FormEvent } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "요청에 실패했습니다.");
      return;
    }

    setSent(true);
  }

  return (
    <>
      <Head>
        <title>비밀번호 찾기 — 화성 AI 시민리더 잇다(IT-DA)</title>
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
            {sent ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h1 className="text-xl font-black text-hwaseong-text mb-2">이메일을 확인해 주세요</h1>
                <p className="text-sm text-gray-500 mb-1">
                  <span className="font-semibold text-hwaseong-blue">{email}</span> 으로
                </p>
                <p className="text-sm text-gray-500 mb-6">비밀번호 재설정 링크를 전송했습니다.</p>
                <p className="text-xs text-gray-400 mb-6">링크는 1시간 동안 유효합니다. 메일이 오지 않으면 스팸함을 확인해 주세요.</p>
                <Link
                  href="/login"
                  className="block w-full py-3 bg-hwaseong-blue text-white text-sm font-bold rounded-xl hover:bg-blue-900 transition-colors text-center"
                >
                  로그인으로 돌아가기
                </Link>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-black text-hwaseong-text mb-1">비밀번호 찾기</h1>
                <p className="text-sm text-gray-500 mb-8">
                  가입한 이메일을 입력하면 재설정 링크를 보내드립니다.
                </p>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1.5">이메일</label>
                    <input
                      id="email" type="email" value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@email.com" required autoComplete="email"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30 focus:border-hwaseong-blue transition-colors"
                    />
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit" disabled={submitting}
                    className="w-full py-3.5 bg-hwaseong-blue hover:bg-blue-900 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition-colors shadow-md"
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        전송 중...
                      </span>
                    ) : "재설정 링크 보내기"}
                  </button>
                </form>

                <div className="mt-5 pt-5 border-t border-gray-100 text-center">
                  <Link href="/login" className="text-sm text-gray-400 hover:text-hwaseong-blue transition-colors">
                    ← 로그인으로 돌아가기
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
