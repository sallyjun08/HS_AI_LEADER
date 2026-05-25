import Head from "next/head";
import Link from "next/link";
import { useState, useEffect, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/router";
import { useAuth, ROLE_REDIRECTS } from "@/lib/auth-context";

type LoginRole = "leader" | "client" | "admin";

const ROLE_CONFIG: Record<LoginRole, {
  icon: string; label: string; sub: string;
  gradient: string; border: string; badge: string; badgeStyle: string;
}> = {
  leader: {
    icon: "🏅", label: "시민 리더로 로그인하기", sub: "강의 일정 · 활동 보고서 · 포트폴리오",
    gradient: "from-hwaseong-blue to-indigo-600", border: "border-hwaseong-blue",
    badge: "AI 시민 리더", badgeStyle: "bg-indigo-100 text-indigo-700",
  },
  client: {
    icon: "🏢", label: "수요처로 로그인하기", sub: "강사 매칭 요청 · 현황 조회 · 후기 작성",
    gradient: "from-green-600 to-teal-600", border: "border-green-500",
    badge: "교육 수요처", badgeStyle: "bg-green-100 text-green-700",
  },
  admin: {
    icon: "⚙️", label: "운영자로 로그인하기", sub: "강사 인증 · 스마트 매칭 · 통합 관제",
    gradient: "from-gray-600 to-gray-700", border: "border-gray-500",
    badge: "운영자", badgeStyle: "bg-gray-100 text-gray-600",
  },
};

export default function LoginPage() {
  const { user, loading, signIn: _signIn, refresh } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedRole, setSelectedRole] = useState<LoginRole | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent" | "error" | "rate_limit">("idle");
  const [editingEmail, setEditingEmail] = useState(false);
  const [editEmailValue, setEditEmailValue] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  function pickRole(role: LoginRole) {
    setSelectedRole(role);
    setError(null);
    setStep(2);
  }

  const ROLE_NAMES: Record<LoginRole, string> = {
    leader: "시민 리더",
    client: "수요처",
    admin: "운영자",
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role: selectedRole }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if ((data as { unverified?: boolean }).unverified) {
          setUnverifiedEmail((data as { email?: string }).email ?? email);
          return;
        }
        setError((data as { error?: string }).error ?? "로그인에 실패했습니다.");
        return;
      }
      // 로그인 성공 — auth context 갱신 (쿠키는 이미 서버에서 세팅됨)
      await refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend(targetEmail?: string) {
    const sendTo = targetEmail ?? unverifiedEmail;
    if (!sendTo || resendStatus === "sending") return;
    setResendStatus("sending");
    const res = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: sendTo }),
    });
    if (res.ok) {
      if (targetEmail) setUnverifiedEmail(targetEmail);
      setEditingEmail(false);
      setResendStatus("sent");
    } else {
      const data = await res.json().catch(() => ({}));
      if (res.status === 429) {
        setResendStatus("rate_limit");
        setResendCooldown(60);
      } else {
        setResendStatus("error");
      }
      if (res.status !== 429) console.error(data);
    }
  }

  // 이메일 미인증 화면
  if (unverifiedEmail) {
    return (
      <>
        <Head>
          <title>이메일 인증 필요 — 화성 AI 시민리더 잇다(IT-DA)</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-[#001845] via-[#004C97] to-[#003d7a] flex flex-col items-center justify-center px-4 py-12">
          <Link href="/" className="inline-flex items-center gap-3 mb-8 group">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <span className="text-hwaseong-blue font-extrabold text-[9px] leading-tight text-center">AI<br />잇다</span>
            </div>
            <div className="text-left">
              <p className="text-blue-200 text-xs">화성시 AI 시민리더 매칭 플랫폼</p>
              <p className="text-white font-bold text-lg">화성 AI 시민리더 잇다(IT-DA)</p>
            </div>
          </Link>

          <div className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-sm text-center">
            <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl">
              ✉️
            </div>
            <h2 className="text-xl font-black text-hwaseong-text mb-2">이메일 인증이 필요합니다</h2>
            <p className="text-sm text-gray-500 mb-1">가입 시 입력한 이메일로 인증 메일을 보냈습니다.</p>
            {/* 이메일 표시 / 수정 */}
            {editingEmail ? (
              <div className="mb-6">
                <input
                  type="email"
                  value={editEmailValue}
                  onChange={(e) => setEditEmailValue(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30 focus:border-hwaseong-blue transition-colors mb-2"
                  autoFocus
                />
                <button
                  onClick={() => { setEditingEmail(false); setEditEmailValue(""); }}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  취소
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 mb-6">
                <p className="font-semibold text-hwaseong-blue text-sm break-all">{unverifiedEmail}</p>
                <button
                  onClick={() => { setEditingEmail(true); setEditEmailValue(unverifiedEmail ?? ""); setResendStatus("idle"); }}
                  className="text-xs text-gray-400 hover:text-hwaseong-blue transition-colors flex-shrink-0 underline underline-offset-2"
                >
                  수정
                </button>
              </div>
            )}

            <p className="text-xs text-gray-400 mb-8 leading-relaxed">
              메일함에서 <strong className="text-gray-600">이메일 인증하기</strong> 버튼을 클릭한 후<br />
              다시 로그인해 주세요. 스팸함도 확인해 보세요.
            </p>

            <div className="space-y-2">
              {resendStatus === "sent" ? (
                <p className="text-sm text-green-600 font-semibold py-3">✅ 인증 메일을 다시 보냈습니다.</p>
              ) : (
                <button
                  onClick={() => handleResend(editingEmail && editEmailValue.trim() ? editEmailValue.trim() : undefined)}
                  disabled={resendStatus === "sending" || resendCooldown > 0 || (editingEmail && !editEmailValue.trim())}
                  className="w-full py-3 bg-hwaseong-blue hover:bg-blue-900 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition-colors"
                >
                  {resendStatus === "sending"
                    ? "발송 중..."
                    : resendCooldown > 0
                      ? `${resendCooldown}초 후 재시도 가능`
                      : editingEmail && editEmailValue.trim()
                        ? "이 주소로 인증 메일 보내기"
                        : "인증 메일 다시 보내기"}
                </button>
              )}
              {resendStatus === "error" && (
                <p className="text-xs text-red-500">메일 발송에 실패했습니다. 이메일 주소를 확인해 주세요.</p>
              )}
              <button
                onClick={() => { setUnverifiedEmail(null); setResendStatus("idle"); setEditingEmail(false); }}
                className="w-full py-3 bg-gray-100 text-gray-500 font-semibold text-sm rounded-xl hover:bg-gray-200 transition-colors"
              >
                다른 계정으로 로그인
              </button>
            </div>
          </div>
          <p className="text-center text-blue-200/40 text-xs mt-8">화성특례시 AI 혁신학교 AI랩 © 2026</p>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#eef3f9] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-hwaseong-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const cfg = selectedRole ? ROLE_CONFIG[selectedRole] : null;

  return (
    <>
      <Head>
        <title>로그인 — 화성 AI 시민리더 잇다(IT-DA)</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-[#001845] via-[#004C97] to-[#003d7a] flex flex-col items-center justify-center px-4 py-12">

        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-3 mb-8 group">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
            <span className="text-hwaseong-blue font-extrabold text-[9px] leading-tight text-center">AI<br />잇다</span>
          </div>
          <div className="text-left">
            <p className="text-blue-200 text-xs">화성시 AI 시민리더 매칭 플랫폼</p>
            <p className="text-white font-bold text-lg">화성 AI 시민리더 잇다(IT-DA)</p>
          </div>
        </Link>

        {/* ── STEP 1: 역할 선택 ── */}
        {step === 1 && (
          <div className="w-full max-w-xl">
            <h1 className="text-center text-white text-2xl font-black mb-2">어떤 역할로 로그인하시나요?</h1>
            <p className="text-center text-blue-200 text-sm mb-8">역할을 선택해 로그인하면 메인화면에서 대시보드에 입장할 수 있습니다.</p>

            {/* 메인 2카드 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {(["leader", "client"] as LoginRole[]).map((role) => {
                const c = ROLE_CONFIG[role];
                return (
                  <button
                    key={role}
                    onClick={() => pickRole(role)}
                    className="group bg-white/5 hover:bg-white/10 border-2 border-white/20 hover:border-white/50 rounded-3xl p-7 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-2xl"
                  >
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${c.gradient} flex items-center justify-center text-2xl mb-5 shadow-lg`}>
                      {c.icon}
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.badgeStyle} mb-3 inline-block`}>
                      {c.badge}
                    </span>
                    <h2 className="text-white font-black text-base leading-snug mb-2">{c.label}</h2>
                    <p className="text-blue-300 text-xs">{c.sub}</p>
                  </button>
                );
              })}
            </div>

            {/* 운영자 — 작게 하단 배치 */}
            <button
              onClick={() => pickRole("admin")}
              className="w-full flex items-center justify-center gap-2.5 py-3 px-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/30 transition-all text-sm text-blue-200 hover:text-white"
            >
              <span className="text-base">{ROLE_CONFIG.admin.icon}</span>
              <span className="font-medium">{ROLE_CONFIG.admin.label}</span>
              <span className="text-blue-400 text-xs ml-1">— {ROLE_CONFIG.admin.sub}</span>
            </button>

            <p className="text-center text-blue-300/60 text-xs mt-8">
              계정이 없으신가요?{" "}
              <Link href="/register" className="text-blue-200 hover:text-white underline">회원가입</Link>
            </p>
          </div>
        )}

        {/* ── STEP 2: 로그인 폼 ── */}
        {step === 2 && cfg && (
          <div className="w-full max-w-md">
            <div className="bg-white rounded-3xl shadow-2xl p-8">

              {/* 선택 역할 표시 */}
              <div className={`flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r ${cfg.gradient} mb-6`}>
                <span className="text-2xl">{cfg.icon}</span>
                <div>
                  <p className="text-white font-bold text-sm">{cfg.badge}</p>
                  <p className="text-white/70 text-xs">로 로그인합니다</p>
                </div>
                <button
                  onClick={() => { setStep(1); setError(null); }}
                  className="ml-auto text-white/70 hover:text-white text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
                >
                  변경
                </button>
              </div>

              <h2 className="text-xl font-black text-hwaseong-text mb-1">로그인</h2>
              <p className="text-sm text-gray-400 mb-6">계정 정보를 입력하세요.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-xs font-semibold text-gray-600 mb-1.5">이메일</label>
                  <input
                    id="email" type="email" value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com" required autoComplete="email"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30 focus:border-hwaseong-blue transition-colors placeholder-gray-300"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="text-xs font-semibold text-gray-600">비밀번호</label>
                    <Link href="/forgot-password" className="text-xs text-hwaseong-skyblue hover:underline">비밀번호 찾기</Link>
                  </div>
                  <div className="relative">
                    <input
                      id="password" type={showPw ? "text" : "password"} value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••" required autoComplete="current-password"
                      className="w-full px-4 py-3 pr-11 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30 focus:border-hwaseong-blue transition-colors placeholder-gray-300"
                    />
                    <button
                      type="button" onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 보기"}
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-start gap-2">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
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
                      로그인 중...
                    </span>
                  ) : "로그인"}
                </button>
              </form>

              <div className="mt-5 pt-5 border-t border-gray-100 flex items-center justify-between">
                <Link href="/register" className="text-sm text-hwaseong-skyblue hover:underline font-medium">
                  회원가입 →
                </Link>
                <Link href="/" className="text-sm text-gray-400 hover:text-hwaseong-blue transition-colors">
                  ← 메인으로
                </Link>
              </div>
            </div>
          </div>
        )}

        <p className="text-center text-blue-200/40 text-xs mt-8">화성특례시 AI 혁신학교 AI랩 © 2026</p>
      </div>
    </>
  );
}
