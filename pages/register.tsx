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

const SPECIALTY_GROUPS = [
  { group: "AI 기초·윤리",     items: ["생성형 AI", "ChatGPT 활용", "AI 윤리", "AI 리터러시", "미디어 리터러시"] },
  { group: "프로그래밍·데이터", items: ["파이썬 기초", "데이터 분석", "코딩 기초", "노코드 도구", "엑셀·자동화"] },
  { group: "창의·융합",         items: ["메이커 교육", "로봇 코딩", "AI 예술", "SW 융합", "디지털 리터러시"] },
  { group: "비즈니스·실무",     items: ["AI 업무 혁신", "챗봇 활용", "영상 제작", "소셜미디어", "AI 마케팅"] },
];

const REGION_ZONES = [
  { zone: "동부권", items: ["동탄1동", "동탄2동", "동탄면", "기흥"] },
  { zone: "남부권", items: ["봉담읍", "향남읍", "발안", "팔탄면"] },
  { zone: "서부권", items: ["남양읍", "마도면", "서신면", "우정읍", "장안면"] },
  { zone: "북부권", items: ["병점동", "기산동", "안녕동", "진안동"] },
];

export default function RegisterPage() {
  const router = useRouter();
  const ORG_TYPES = ["초등학교", "중학교", "고등학교", "대학교", "구청/주민센터", "기업", "복지관", "도서관", "기타"];

  const [step, setStep] = useState<number>(1);
  const [role, setRole] = useState<Role | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", orgName: "", orgType: "", orgTypeCustom: "" });
  const [emailStatus, setEmailStatus] = useState<"idle" | "checking" | "ok" | "taken">("idle");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certPreview, setCertPreview] = useState<string | null>(null);
  const [certUploadStatus, setCertUploadStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [certImageUrl, setCertImageUrl] = useState<string | null>(null);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [verifyEmail, setVerifyEmail] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent" | "error" | "rate_limit">("idle");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [editingEmail, setEditingEmail] = useState(false);
  const [editEmailValue, setEditEmailValue] = useState("");

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

  function handleNextStep() {
    setError(null);
    if (step === 2) {
      if (!form.name.trim()) return setError("이름을 입력해 주세요.");
      if (emailStatus !== "ok") return setError("이메일 중복 확인을 해주세요.");
      if (form.password.length < 6) return setError("비밀번호는 6자 이상이어야 합니다.");
      if (form.password !== form.confirm) return setError("비밀번호가 일치하지 않습니다.");
    }
    setStep((s) => s + 1);
  }

  function handleCertFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 업로드 가능합니다.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("파일 크기는 8MB 이하여야 합니다.");
      return;
    }
    setCertFile(file);
    setCertImageUrl(null);
    setCertUploadStatus("idle");
    const reader = new FileReader();
    reader.onload = (ev) => setCertPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function uploadCertImage(): Promise<string | null> {
    if (!certFile) return null;
    setCertUploadStatus("uploading");
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = (ev.target?.result as string).split(",")[1];
        const res = await fetch("/api/auth/upload-cert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: certFile.name, mimeType: certFile.type, data: base64 }),
        });
        if (res.ok) {
          const { url } = await res.json();
          setCertImageUrl(url);
          setCertUploadStatus("done");
          resolve(url);
        } else {
          setCertUploadStatus("error");
          resolve(null);
        }
      };
      reader.readAsDataURL(certFile);
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!role) return;
    if (emailStatus !== "ok") return setError("이메일 중복 확인을 해주세요.");
    if (form.password.length < 6) return setError("비밀번호는 6자 이상이어야 합니다.");
    if (form.password !== form.confirm) return setError("비밀번호가 일치하지 않습니다.");
    if (role === "leader" && !certFile && !certImageUrl) return setError("AI 시민 리더 교육 인증서를 업로드해 주세요.");
    setError(null);
    setSubmitting(true);

    let uploadedCertUrl = certImageUrl;
    if (role === "leader" && certFile && !certImageUrl) {
      uploadedCertUrl = await uploadCertImage();
      if (!uploadedCertUrl) {
        setError("인증서 이미지 업로드에 실패했습니다. 다시 시도해 주세요.");
        setSubmitting(false);
        return;
      }
    }

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name, email: form.email, password: form.password, role,
        ...(role === "client" ? {
          orgName: form.orgName,
          orgType: form.orgType === "기타" ? (form.orgTypeCustom.trim() || "기타") : (form.orgType || null),
        } : {}),
        ...(role === "leader" ? {
          ...(uploadedCertUrl ? { certImageUrl: uploadedCertUrl } : {}),
          specialties: selectedSpecialties,
          availableRegions: selectedRegions,
        } : {}),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "회원가입에 실패했습니다.");
      setSubmitting(false);
      return;
    }

    if (data.pending) {
      // 이메일 인증 필요 — 확인 화면으로 전환
      setVerifyEmail(data.email ?? form.email);
      return;
    }

    // 자동 인증(개발 환경 등) — 메인으로 이동
    router.replace("/");
  }

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  async function handleResend(targetEmail?: string) {
    const sendTo = targetEmail ?? verifyEmail;
    if (!sendTo || resendStatus === "sending") return;
    setResendStatus("sending");
    const res = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: sendTo }),
    });
    if (res.ok) {
      if (targetEmail) setVerifyEmail(targetEmail);
      setEditingEmail(false);
      setResendStatus("sent");
    } else {
      if (res.status === 429) {
        setResendStatus("rate_limit");
        setResendCooldown(60);
      } else {
        setResendStatus("error");
      }
    }
  }

  const selectedRole = ROLES.find((r) => r.id === role);

  // 이메일 인증 대기 화면
  if (verifyEmail) {
    return (
      <>
        <Head>
          <title>이메일 확인 — 화성 AI 시민리더 잇다(IT-DA)</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-[#001845] via-[#003087] to-[#00419e] flex flex-col items-center justify-center px-4 py-12">
          <Link href="/" className="inline-flex items-center gap-3 mb-8 group">
            <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <span className="text-hwaseong-blue font-extrabold text-[8px] leading-tight text-center">AI<br />잇다</span>
            </div>
            <div className="text-left">
              <p className="text-blue-200 text-xs">화성시 AI 시민리더 매칭 플랫폼</p>
              <p className="text-white font-bold text-base">화성 AI 시민리더 잇다(IT-DA)</p>
            </div>
          </Link>

          <div className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-sm text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl">
              ✉️
            </div>
            <h2 className="text-xl font-black text-hwaseong-text mb-2">이메일을 확인해 주세요</h2>
            <p className="text-sm text-gray-500 mb-1">아래 주소로 인증 메일을 보냈습니다.</p>

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
                <p className="font-semibold text-hwaseong-blue text-sm break-all">{verifyEmail}</p>
                <button
                  onClick={() => { setEditingEmail(true); setEditEmailValue(verifyEmail ?? ""); setResendStatus("idle"); }}
                  className="text-xs text-gray-400 hover:text-hwaseong-blue transition-colors flex-shrink-0 underline underline-offset-2"
                >
                  수정
                </button>
              </div>
            )}

            <p className="text-xs text-gray-400 mb-8 leading-relaxed">
              메일함에서 <strong className="text-gray-600">이메일 인증하기</strong> 버튼을 클릭하면
              가입이 완료됩니다.<br />스팸함도 확인해 보세요.
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
              <Link href="/login" className="block w-full py-3 bg-gray-100 text-gray-500 font-semibold text-sm rounded-xl hover:bg-gray-200 transition-colors text-center">
                로그인 페이지로 이동
              </Link>
              <button
                onClick={() => { setVerifyEmail(null); setSubmitting(false); setResendStatus("idle"); setEditingEmail(false); }}
                className="w-full py-2 text-gray-400 text-xs hover:text-gray-600 transition-colors"
              >
                처음부터 다시 입력하기
              </button>
            </div>
          </div>
          <p className="text-blue-200/40 text-xs mt-8">화성특례시 AI 혁신학교 AI랩 © 2026</p>
        </div>
      </>
    );
  }

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
        {(() => {
          const labels = role === "leader"
            ? ["역할 선택", "기본 정보", "전문분야·지역", "인증서"]
            : ["역할 선택", "정보 입력"];
          const total = labels.length;
          return (
            <div className="flex items-center gap-2 mb-8">
              {labels.map((label, i) => {
                const s = i + 1;
                return (
                  <div key={s} className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                      step > s ? "bg-white text-green-600" :
                      step === s ? "bg-white text-hwaseong-blue" :
                      "bg-white/20 text-white/50"
                    }`}>
                      {step > s ? "✓" : s}
                    </div>
                    {s < total && (
                      <div className={`w-8 h-0.5 rounded transition-all duration-300 ${step > s ? "bg-white" : "bg-white/20"}`} />
                    )}
                  </div>
                );
              })}
              <span className="ml-2 text-blue-200 text-xs">{labels[step - 1] ?? ""}</span>
            </div>
          );
        })()}

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

        {/* ── STEP 2~4: 정보 입력 (멀티스텝) ── */}
        {step >= 2 && selectedRole && (
          <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white rounded-3xl shadow-2xl p-8">

              {/* 역할 뱃지 */}
              <div className={`flex items-center gap-3 p-3.5 rounded-2xl bg-gradient-to-r ${selectedRole.gradient} mb-6`}>
                <span className="text-xl">{selectedRole.icon}</span>
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

              {/* 단계별 타이틀 */}
              <h1 className="text-xl font-black text-hwaseong-text mb-1">
                {role === "leader"
                  ? step === 2 ? "기본 정보를 입력해 주세요"
                    : step === 3 ? "활동 분야와 지역을 선택해 주세요"
                    : "AI 교육 인증서를 업로드해 주세요"
                  : "정보를 입력해 주세요"}
              </h1>
              <p className="text-sm text-gray-400 mb-6">
                {step === 2
                  ? role === "client"
                    ? "가입 후 대시보드에서 추가 정보를 작성할 수 있습니다."
                    : "이름, 이메일, 비밀번호를 입력합니다."
                  : "선택 항목입니다. 나중에 프로필에서 수정할 수 있습니다."}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">

                {/* ── STEP 2: 기본 정보 ── */}
                {step === 2 && (
                  <>
                    {/* 수요처 전용: 기관명 + 기관 유형 */}
                    {role === "client" && (
                      <>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                            기관명 <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text" value={form.orgName}
                            onChange={(e) => update("orgName", e.target.value)}
                            placeholder="예: 동탄초등학교, 화성시청" required
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-1.5">기관 유형</label>
                          <select
                            value={form.orgType}
                            onChange={(e) => update("orgType", e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-colors bg-white text-gray-700"
                          >
                            <option value="">선택 안 함</option>
                            {ORG_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                          {form.orgType === "기타" && (
                            <input
                              type="text"
                              value={form.orgTypeCustom}
                              onChange={(e) => update("orgTypeCustom", e.target.value)}
                              placeholder="기관 유형을 직접 입력해 주세요"
                              className="mt-2 w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-colors"
                            />
                          )}
                        </div>
                        <div className="border-t border-gray-100" />
                      </>
                    )}

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
                  </>
                )}

                {/* ── STEP 3 (강사): 전문 분야 + 활동 지역 ── */}
                {step === 3 && role === "leader" && (
                  <>
                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-base">🎯</span>
                        <span className="text-sm font-bold text-indigo-900">전문 분야</span>
                        <span className="text-[11px] text-indigo-400 font-normal">복수 가능</span>
                        {selectedSpecialties.length > 0 && (
                          <span className="ml-auto text-[11px] bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-full">
                            {selectedSpecialties.length}개 선택
                          </span>
                        )}
                      </div>
                      <div className="space-y-2.5">
                        {SPECIALTY_GROUPS.map(({ group, items }) => (
                          <div key={group}>
                            <p className="text-[10px] text-indigo-400 font-semibold mb-1">{group}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {items.map((item) => {
                                const active = selectedSpecialties.includes(item);
                                return (
                                  <button
                                    key={item} type="button"
                                    onClick={() =>
                                      setSelectedSpecialties((prev) =>
                                        active ? prev.filter((s) => s !== item) : [...prev, item]
                                      )
                                    }
                                    className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                                      active
                                        ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                                        : "bg-white border-indigo-200 text-indigo-500 hover:border-indigo-400 hover:bg-indigo-100"
                                    }`}
                                  >
                                    {item}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-base">📍</span>
                        <span className="text-sm font-bold text-blue-900">활동 가능 지역</span>
                        <span className="text-[11px] text-blue-400 font-normal">복수 가능</span>
                        {selectedRegions.length > 0 && (
                          <span className="ml-auto text-[11px] bg-blue-600 text-white font-bold px-2 py-0.5 rounded-full">
                            {selectedRegions.length}개 선택
                          </span>
                        )}
                      </div>
                      <div className="space-y-2.5">
                        {REGION_ZONES.map(({ zone, items }) => (
                          <div key={zone}>
                            <p className="text-[10px] text-blue-400 font-semibold mb-1">{zone}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {items.map((item) => {
                                const active = selectedRegions.includes(item);
                                return (
                                  <button
                                    key={item} type="button"
                                    onClick={() =>
                                      setSelectedRegions((prev) =>
                                        active ? prev.filter((r) => r !== item) : [...prev, item]
                                      )
                                    }
                                    className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                                      active
                                        ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                                        : "bg-white border-blue-200 text-blue-500 hover:border-blue-400 hover:bg-blue-100"
                                    }`}
                                  >
                                    {item}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* ── STEP 4 (강사): 교육 인증서 ── */}
                {step === 4 && role === "leader" && (
                  <div>
                    {certPreview ? (
                      <div className="relative rounded-2xl overflow-hidden border border-indigo-200 bg-indigo-50">
                        <img src={certPreview} alt="인증서 미리보기" className="w-full max-h-64 object-contain" />
                        <button
                          type="button"
                          onClick={() => { setCertFile(null); setCertPreview(null); setCertImageUrl(null); setCertUploadStatus("idle"); }}
                          className="absolute top-2 right-2 w-7 h-7 bg-black/50 hover:bg-black/70 text-white rounded-full text-xs flex items-center justify-center transition-colors"
                        >
                          ✕
                        </button>
                        {certUploadStatus === "done" && (
                          <div className="absolute bottom-2 left-2 bg-green-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            ✓ 업로드 완료
                          </div>
                        )}
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center gap-3 w-full h-48 border-2 border-dashed border-gray-200 hover:border-indigo-400 rounded-2xl cursor-pointer bg-gray-50 hover:bg-indigo-50 transition-colors group">
                        <span className="text-4xl group-hover:scale-110 transition-transform">📄</span>
                        <div className="text-center">
                          <p className="text-sm text-gray-500 group-hover:text-indigo-600 transition-colors font-medium">
                            클릭하여 인증서 이미지 선택
                          </p>
                          <p className="text-xs text-gray-300 mt-1">JPG, PNG, WEBP · 최대 8MB</p>
                        </div>
                        <input type="file" accept="image/*" onChange={handleCertFileChange} className="hidden" />
                      </label>
                    )}
                    <p className="text-xs text-red-400 mt-3 text-center font-medium">
                      수료증 업로드는 필수입니다.
                    </p>
                  </div>
                )}

                {/* 에러 */}
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-start gap-2">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {error}
                  </div>
                )}

                {/* 하단 버튼 */}
                <div className={`flex gap-2 ${step > 2 ? "" : ""}`}>
                  {step > 2 && (
                    <button
                      type="button"
                      onClick={() => { setStep((s) => s - 1); setError(null); }}
                      className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold text-sm rounded-xl transition-colors"
                    >
                      ← 이전
                    </button>
                  )}
                  {role === "leader" && step < 4 ? (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="flex-1 py-3.5 bg-hwaseong-blue hover:bg-blue-900 text-white font-bold text-sm rounded-xl transition-colors shadow-md"
                    >
                      다음 →
                    </button>
                  ) : (
                    <button
                      type="submit" disabled={submitting}
                      className="flex-1 py-3.5 bg-hwaseong-blue hover:bg-blue-900 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition-colors shadow-md"
                    >
                      {submitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          가입 중...
                        </span>
                      ) : "가입하기"}
                    </button>
                  )}
                </div>
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
