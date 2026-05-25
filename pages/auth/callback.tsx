import Head from "next/head";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function handleCallback() {
      // PKCE 방식: ?code=xxx
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");

      // Implicit 방식: #access_token=xxx (레거시)
      const hash = window.location.hash;
      const hashParams = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : "");
      const accessToken = hashParams.get("access_token");
      const tokenType = hashParams.get("type");

      const payload = code
        ? { code }
        : accessToken && tokenType === "signup"
          ? { access_token: accessToken }
          : null;

      if (!payload) {
        router.replace("/");
        return;
      }

      try {
        const res = await fetch("/api/auth/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          router.replace("/");
        } else {
          const data = await res.json().catch(() => ({}));
          setErrorMsg((data as { error?: string }).error ?? "인증에 실패했습니다.");
          setStatus("error");
        }
      } catch {
        setErrorMsg("서버 연결 오류가 발생했습니다.");
        setStatus("error");
      }
    }

    handleCallback();
  }, [router]);

  return (
    <>
      <Head>
        <title>이메일 인증 중 — 화성 AI 시민리더 잇다(IT-DA)</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-[#001845] via-[#004C97] to-[#003d7a] flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-sm text-center">
          {status === "loading" ? (
            <>
              <div className="w-14 h-14 border-4 border-hwaseong-blue border-t-transparent rounded-full animate-spin mx-auto mb-6" />
              <h2 className="text-lg font-black text-hwaseong-text mb-2">이메일 인증 처리 중</h2>
              <p className="text-sm text-gray-400">잠시만 기다려 주세요...</p>
            </>
          ) : (
            <>
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">⚠️</span>
              </div>
              <h2 className="text-lg font-black text-hwaseong-text mb-2">인증 실패</h2>
              <p className="text-sm text-gray-500 mb-6">{errorMsg}</p>
              <a
                href="/register"
                className="inline-block px-6 py-3 bg-hwaseong-blue text-white font-bold text-sm rounded-xl hover:bg-blue-900 transition-colors"
              >
                다시 가입하기
              </a>
            </>
          )}
        </div>
      </div>
    </>
  );
}
