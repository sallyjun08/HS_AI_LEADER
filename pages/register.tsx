import Head from "next/head";
import Link from "next/link";
import { useState, useEffect, type FormEvent } from "react";
import { CheckCircle2, XCircle, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/router";

type Role = "leader" | "client";

const ROLES: {
  id: Role;
  icon: string;
  title: string;
  subtitle: string;
  desc: string[];
  gradient: string;
  border: string;
  badge: string;
  badgeStyle: string;
}[] = [
  {
    id: "leader",
    icon: "🏅",
    title: "강사(시민 리더)로 시작하기",
    subtitle: "AI 시민 리더",
    desc: ["강의 일정 · 매칭 요청 관리", "활동 보고서 · 포트폴리오", "화성특례시 공식 인증 취득"],
    gradient: "from-hwaseong-blue to-indigo-600",
    border: "border-hwaseong-blue",
    badge: "강사",
    badgeStyle: "bg-indigo-100 text-indigo-700",
  },
  {
    id: "client",
    icon: "🏢",
    title: "수요처(학교/기관)로 시작하기",
    subtitle: "교육 수요처",
    desc: ["AI 강사 매칭 요청 등록", "안심매칭으로 강사 정보 보호", "강의 완료 후 만족도 평가"],
    gradient: "from-green-600 to-teal-600",
    border: "border-green-500",
    badge: "수요처",
    badgeStyle: "bg-green-100 text-green-700",
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<Role | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [emailStatus, setEmailStatus] = useState<"idle" | "checking" | "ok" | "taken">("idle");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // URL 쿼리로 역할이 전달되면 step 1을 건너뜀
  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query.role;
    if (q === "leader" || q === "client") {
      setRole(q);
      setStep(2);
    }
  }, [router.isReady, router.query.role]);

  function selectRole(r: Role) {
    setRole(r);
    setTimeout(() => setStep(2), 180);
  }

  function update(key: string, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
    if (key === "email") setEmailStatus("idle");
  }

  async function checkEmail() {
    if (!form.email) return;
    setEmailStatus("checking");
    const res = await fetch("/api/auth/check-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email }),
    });
    const data = await res.json();
    setEmailStatus(data.available ? "ok" : "taken");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!role) return;
    if (emailStatus !== "ok") return setError("이메일 중복 확인을 해주세요.");
    if (form.password.length < 6) return setError("비밀번호는 6자 이상이어야 합니다.");
    if (form.password !== form.confirm) return setError("비밀번호가 일치하지 않습니다.");
    setError(null);
    setSubmitting(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, email: form.email, password: form.password, role }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "회원가입에 실패했습니다.");
      setSubmitting(false);
      return;
    }

    router.replace(role === "leader" ? "/dashboard/leader" : "/dashboard/client");
  }

  const selectedRole = ROLES.find((r) => r.id === role);

  return (
    <>
      <Head>
        <title>회원가입 — 화성 AI 시민리더 잇다(IT-DA)</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-[#001845] via-[#003087] to-[#00419e] flex flex-col items-center justify-center px-4 py-12">

        {/* 로고 */}
        <Link href="/" className="inline-flex items-center gap-3 mb-8 group">
          <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
            <span className="text-hwaseong-blue font-extrabold text-[8px] leading-tight text-center">AI<br />잇다</span>
          </div>
          <div className="text-left">
            <p className="text-blue-200 text-xs">화성시 AI 시민리더 매칭 플랫폼</p>
            <p className="text-white font-bold text-base">화성 AI 시민리더 잇다(IT-DA)</p>
          </div>
        </Link>

        {/* 진행 단계 */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                step >= s ? "bg-white text-hwaseong-blue" : "bg-white/20 text-white/50"
              }`}>
                {s}
              </div>
              {s < 2 && <div className={`w-12 h-0.5 rounded transition-all duration-300 ${step >= 2 ? "bg-white" : "bg-white/20"}`} />}
            </div>
          ))}
          <span className="ml-2 text-blue-200 text-xs">
            {step === 1 ? "역할 선택" : "정보 입력"}
          </span>
        </div>

        {/* ── STEP 1: 역할 선택 ── */}
        <div className={`w-full max-w-2xl transition-all duration-300 ${step === 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none absolute"}`}>
          <h1 className="text-center text-white text-2xl font-black mb-2">어떤 역할로 시작하시나요?</h1>
          <p className="text-center text-blue-200 text-sm mb-8">역할에 맞는 대시보드와 기능이 제공됩니다.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {ROLES.map((r) => (
              <button
                key={r.id}
                onClick={() => selectRole(r.id)}
                className={`group relative bg-white/5 hover:bg-white/10 border-2 rounded-3xl p-7 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-2xl ${
                  role === r.id ? `${r.border} bg-white/10 scale-[1.02]` : "border-white/20"
                }`}
              >
                {role === r.id && (
                  <div className="absolute top-4 right-4 w-6 h-6 bg-white rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-hwaseong-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}

                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${r.gradient} flex items-center justify-center text-2xl mb-5 shadow-lg`}>
                  {r.icon}
                </div>

                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${r.badgeStyle} mb-3 inline-block`}>
                  {r.badge}
                </span>

                <h2 className="text-white font-black text-lg leading-snug mb-3">{r.title}</h2>

                <ul className="space-y-1.5">
                  {r.desc.map((d) => (
                    <li key={d} className="flex items-center gap-2 text-blue-200 text-sm">
                      <span className="w-1 h-1 rounded-full bg-blue-300 flex-shrink-0" />
                      {d}
                    </li>
                  ))}
                </ul>
              </button>
            ))}
          </div>

          <p className="text-center text-blue-300/60 text-xs mt-8">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="text-blue-200 hover:text-white underline">로그인</Link>
          </p>
        </div>

        {/* ── STEP 2: 정보 입력 ── */}
        {step === 2 && selectedRole && (
          <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white rounded-3xl shadow-2xl p-8">

              {/* 선택된 역할 표시 */}
              <div className={`flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r ${selectedRole.gradient} mb-6`}>
                <span className="text-2xl">{selectedRole.icon}</span>
                <div>
                  <p className="text-white font-bold text-sm">{selectedRole.subtitle}</p>
                  <p className="text-white/70 text-xs">로 가입합니다</p>
                </div>
                <button
                  onClick={() => { setStep(1); setError(null); }}
                  className="ml-auto text-white/70 hover:text-white text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
                >
                  변경
                </button>
              </div>

              <h1 className="text-xl font-black text-hwaseong-text mb-1">정보를 입력해 주세요</h1>
              <p className="text-sm text-gray-400 mb-6">가입 후 대시보드에서 추가 정보를 작성할 수 있습니다.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    이름{role === "client" ? " (담당자)" : ""}
                  </label>
                  <input
                    type="text" value={form.name}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="홍길동" required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30 focus:border-hwaseong-blue transition-colors"
                  />
                </div>

                {/* 이메일 + 중복확인 */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">이메일</label>
                  <div className="flex gap-2">
                    <input
                      type="email" value={form.email}
                      onChange={(e) => update("email", e.target.value)}
                      placeholder="example@email.com" required autoComplete="email"
                      className={`flex-1 px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-colors ${
                        emailStatus === "ok"    ? "border-green-400 focus:ring-green-200" :
                        emailStatus === "taken" ? "border-red-400 focus:ring-red-200" :
                        "border-gray-200 focus:ring-hwaseong-blue/30 focus:border-hwaseong-blue"
                      }`}
                    />
                    <button
                      type="button" onClick={checkEmail}
                      disabled={!form.email || emailStatus === "checking"}
                      className="px-4 py-3 bg-hwaseong-blue hover:bg-blue-900 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors whitespace-nowrap"
                    >
                      {emailStatus === "checking" ? "확인 중…" : "중복확인"}
                    </button>
                  </div>
                  {emailStatus === "ok" && (
                    <p className="flex items-center gap-1 text-green-600 text-xs mt-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 사용 가능한 이메일입니다.
                    </p>
                  )}
                  {emailStatus === "taken" && (
                    <p className="flex items-center gap-1 text-red-500 text-xs mt-1.5">
                      <XCircle className="w-3.5 h-3.5" /> 이미 사용 중인 이메일입니다.
                    </p>
                  )}
                </div>

                {/* 비밀번호 */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">비밀번호</label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"} value={form.password}
                      onChange={(e) => update("password", e.target.value)}
                      placeholder="6자 이상" required autoComplete="new-password"
                      className="w-full px-4 py-3 pr-11 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30 focus:border-hwaseong-blue transition-colors"
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

                {/* 비밀번호 확인 */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">비밀번호 확인</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"} value={form.confirm}
                      onChange={(e) => update("confirm", e.target.value)}
                      placeholder="비밀번호 재입력" required autoComplete="new-password"
                      className={`w-full px-4 py-3 pr-11 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-colors ${
                        form.confirm && form.password !== form.confirm ? "border-red-400 focus:ring-red-200" :
                        form.confirm && form.password === form.confirm ? "border-green-400 focus:ring-green-200" :
                        "border-gray-200 focus:ring-hwaseong-blue/30 focus:border-hwaseong-blue"
                      }`}
                    />
                    <button
                      type="button" onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label={showConfirm ? "비밀번호 숨기기" : "비밀번호 보기"}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {form.confirm && form.password !== form.confirm && (
                    <p className="flex items-center gap-1 text-red-500 text-xs mt-1.5">
                      <XCircle className="w-3.5 h-3.5" /> 비밀번호가 일치하지 않습니다.
                    </p>
                  )}
                  {form.confirm && form.password === form.confirm && (
                    <p className="flex items-center gap-1 text-green-600 text-xs mt-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 비밀번호가 일치합니다.
                    </p>
                  )}
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
                      가입 중...
                    </span>
                  ) : "가입하기"}
                </button>
              </form>

              <div className="mt-5 pt-5 border-t border-gray-100 text-center">
                <span className="text-sm text-gray-400">이미 계정이 있으신가요? </span>
                <Link href="/login" className="text-sm text-hwaseong-skyblue hover:underline font-medium">로그인</Link>
              </div>
            </div>
          </div>
        )}

        <p className="text-blue-200/40 text-xs mt-8">화성특례시 AI 혁신학교 AI랩 © 2026</p>
      </div>
    </>
  );
}
