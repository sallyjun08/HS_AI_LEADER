import Head from "next/head";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/lib/auth-context";
import DashboardLayout from "@/components/DashboardLayout";
import { Eye, EyeOff } from "lucide-react";

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

const ORG_TYPES = ["초등학교", "중학교", "고등학교", "대학교", "구청/주민센터", "기업", "복지관", "도서관", "기타"];

type Toast = { msg: string; ok: boolean };

export default function SettingsPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  // 기본 정보
  const [name, setName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  // 강사 전문분야·지역
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [leaderSaving, setLeaderSaving] = useState(false);

  // 비밀번호
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawConfirm, setWithdrawConfirm] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role === "admin")) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? "");
    setOrgName(user.orgName ?? "");
    setOrgType(user.orgType ?? "");
    if (user.leaderProfile) {
      setSpecialties(user.leaderProfile.specialties ?? []);
      setRegions(user.leaderProfile.availableRegions ?? []);
    }
  }, [user]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
  }

  async function saveProfile() {
    if (!name.trim()) return showToast("이름을 입력해 주세요.", false);
    setProfileSaving(true);
    const res = await fetch("/api/auth/update-profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        ...(user?.role === "client" ? { orgName, orgType } : {}),
      }),
    });
    if (res.ok) showToast("기본 정보가 저장됐습니다.", true);
    else {
      const d = await res.json().catch(() => ({}));
      showToast((d as { error?: string }).error ?? "저장에 실패했습니다.", false);
    }
    setProfileSaving(false);
  }

  async function saveLeaderInfo() {
    setLeaderSaving(true);
    const res = await fetch("/api/auth/update-profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ specialties, availableRegions: regions }),
    });
    if (res.ok) showToast("활동 정보가 저장됐습니다.", true);
    else showToast("저장에 실패했습니다.", false);
    setLeaderSaving(false);
  }

  async function changePassword() {
    if (!pwForm.current) return showToast("현재 비밀번호를 입력해 주세요.", false);
    if (pwForm.next.length < 6) return showToast("새 비밀번호는 6자 이상이어야 합니다.", false);
    if (pwForm.next !== pwForm.confirm) return showToast("새 비밀번호가 일치하지 않습니다.", false);
    setPwSaving(true);
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
    });
    if (res.ok) {
      showToast("비밀번호가 변경됐습니다.", true);
      setPwForm({ current: "", next: "", confirm: "" });
    } else {
      const d = await res.json().catch(() => ({}));
      showToast((d as { error?: string }).error ?? "비밀번호 변경에 실패했습니다.", false);
    }
    setPwSaving(false);
  }

  async function handleWithdraw() {
    if (withdrawConfirm !== "탈퇴") return;
    setWithdrawing(true);
    setWithdrawError(null);
    const res = await fetch("/api/auth/withdraw", { method: "DELETE" });
    if (res.ok) {
      await signOut();
      router.replace("/");
    } else {
      const d = await res.json().catch(() => ({}));
      setWithdrawError((d as { error?: string }).error ?? "탈퇴 처리 중 오류가 발생했습니다.");
      setWithdrawing(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-hwaseong-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Head><title>내 정보 | 화성 AI 시민리더 잇다</title></Head>
      <DashboardLayout pageTitle="내 정보">

        {/* 토스트 */}
        {toast && (
          <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold text-white transition-all ${toast.ok ? "bg-green-600" : "bg-red-500"}`}>
            {toast.ok ? "✅ " : "⚠️ "}{toast.msg}
          </div>
        )}

        <div className="max-w-xl space-y-6">

          {/* 기본 정보 */}
          <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-black text-hwaseong-text mb-5 flex items-center gap-2">
              <span>👤</span> 기본 정보
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  이름{user.role === "client" ? " (담당자)" : ""}
                </label>
                <input
                  type="text" value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30 focus:border-hwaseong-blue transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">이메일</label>
                <input
                  type="email" value={user.email} readOnly
                  className="w-full px-4 py-3 border border-gray-100 rounded-xl text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                />
                <p className="text-[11px] text-gray-400 mt-1">이메일은 변경할 수 없습니다.</p>
              </div>

              {user.role === "client" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">기관명</label>
                    <input
                      type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)}
                      placeholder="예: 동탄초등학교"
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30 focus:border-hwaseong-blue transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">기관 유형</label>
                    <select
                      value={orgType} onChange={(e) => setOrgType(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30 focus:border-hwaseong-blue transition-colors bg-white text-gray-700"
                    >
                      <option value="">선택 안 함</option>
                      {ORG_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </>
              )}

              <button
                onClick={saveProfile} disabled={profileSaving}
                className="w-full py-3 bg-hwaseong-blue hover:bg-blue-900 disabled:opacity-60 text-white font-bold text-sm rounded-xl transition-colors"
              >
                {profileSaving ? "저장 중..." : "저장하기"}
              </button>
            </div>
          </section>

          {/* 강사 전용: 전문 분야 + 활동 지역 */}
          {user.role === "leader" && (
            <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-base font-black text-hwaseong-text mb-5 flex items-center gap-2">
                <span>🎯</span> 활동 정보
              </h2>
              <div className="space-y-4">

                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-bold text-indigo-900">전문 분야</span>
                    {specialties.length > 0 && (
                      <span className="ml-auto text-[11px] bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-full">
                        {specialties.length}개 선택
                      </span>
                    )}
                  </div>
                  <div className="space-y-2.5">
                    {SPECIALTY_GROUPS.map(({ group, items }) => (
                      <div key={group}>
                        <p className="text-[10px] text-indigo-400 font-semibold mb-1">{group}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {items.map((item) => {
                            const active = specialties.includes(item);
                            return (
                              <button key={item} type="button"
                                onClick={() => setSpecialties((p) => active ? p.filter((s) => s !== item) : [...p, item])}
                                className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                                  active ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-indigo-200 text-indigo-500 hover:border-indigo-400"
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
                    <span className="text-sm font-bold text-blue-900">활동 가능 지역</span>
                    {regions.length > 0 && (
                      <span className="ml-auto text-[11px] bg-blue-600 text-white font-bold px-2 py-0.5 rounded-full">
                        {regions.length}개 선택
                      </span>
                    )}
                  </div>
                  <div className="space-y-2.5">
                    {REGION_ZONES.map(({ zone, items }) => (
                      <div key={zone}>
                        <p className="text-[10px] text-blue-400 font-semibold mb-1">{zone}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {items.map((item) => {
                            const active = regions.includes(item);
                            return (
                              <button key={item} type="button"
                                onClick={() => setRegions((p) => active ? p.filter((r) => r !== item) : [...p, item])}
                                className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                                  active ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-blue-200 text-blue-500 hover:border-blue-400"
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

                <button
                  onClick={saveLeaderInfo} disabled={leaderSaving}
                  className="w-full py-3 bg-hwaseong-blue hover:bg-blue-900 disabled:opacity-60 text-white font-bold text-sm rounded-xl transition-colors"
                >
                  {leaderSaving ? "저장 중..." : "저장하기"}
                </button>
              </div>
            </section>
          )}

          {/* 비밀번호 변경 */}
          <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-black text-hwaseong-text mb-5 flex items-center gap-2">
              <span>🔒</span> 비밀번호 변경
            </h2>
            <div className="space-y-4">
              {(["current", "next", "confirm"] as const).map((field) => {
                const labels = { current: "현재 비밀번호", next: "새 비밀번호", confirm: "새 비밀번호 확인" };
                const shows = { current: showCurrent, next: showNext, confirm: showConfirm };
                const setShows = { current: setShowCurrent, next: setShowNext, confirm: setShowConfirm };
                const placeholders = { current: "현재 비밀번호 입력", next: "6자 이상", confirm: "새 비밀번호 재입력" };
                const isConfirmErr = field === "confirm" && pwForm.confirm && pwForm.next !== pwForm.confirm;
                const isConfirmOk  = field === "confirm" && pwForm.confirm && pwForm.next === pwForm.confirm;
                return (
                  <div key={field}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">{labels[field]}</label>
                    <div className="relative">
                      <input
                        type={shows[field] ? "text" : "password"}
                        value={pwForm[field]}
                        onChange={(e) => setPwForm((p) => ({ ...p, [field]: e.target.value }))}
                        placeholder={placeholders[field]}
                        autoComplete={field === "current" ? "current-password" : "new-password"}
                        className={`w-full px-4 py-3 pr-11 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-colors ${
                          isConfirmErr ? "border-red-400 focus:ring-red-200" :
                          isConfirmOk  ? "border-green-400 focus:ring-green-200" :
                          "border-gray-200 focus:ring-hwaseong-blue/30 focus:border-hwaseong-blue"
                        }`}
                      />
                      <button
                        type="button" onClick={() => setShows[field]((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {shows[field] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {isConfirmErr && <p className="text-xs text-red-500 mt-1">비밀번호가 일치하지 않습니다.</p>}
                    {isConfirmOk  && <p className="text-xs text-green-600 mt-1">비밀번호가 일치합니다.</p>}
                  </div>
                );
              })}

              <button
                onClick={changePassword} disabled={pwSaving}
                className="w-full py-3 bg-hwaseong-blue hover:bg-blue-900 disabled:opacity-60 text-white font-bold text-sm rounded-xl transition-colors"
              >
                {pwSaving ? "변경 중..." : "비밀번호 변경"}
              </button>
            </div>
          </section>

          {/* 회원 탈퇴 */}
          <div className="flex items-center justify-between px-1">
            <p className="text-xs text-gray-400">더 이상 서비스를 이용하지 않으시나요?</p>
            <button
              onClick={() => { setWithdrawOpen(true); setWithdrawConfirm(""); setWithdrawError(null); }}
              className="text-xs text-gray-400 hover:text-red-500 underline underline-offset-2 transition-colors"
            >
              회원 탈퇴
            </button>
          </div>

        </div>

        {/* 회원 탈퇴 확인 모달 */}
        {withdrawOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6">
              <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4">⚠️</div>
              <h3 className="font-black text-gray-800 text-lg text-center mb-1">정말 탈퇴하시겠어요?</h3>
              <p className="text-sm text-gray-400 text-center mb-5 leading-relaxed">
                탈퇴 시 모든 데이터가 <span className="text-red-500 font-semibold">영구 삭제</span>되며<br />복구할 수 없습니다.
              </p>
              <div className="bg-gray-50 rounded-2xl px-4 py-3 mb-4">
                <p className="text-xs text-gray-500 mb-2 text-center">
                  확인을 위해 아래 입력창에 <span className="font-bold text-gray-700">탈퇴</span>를 입력해 주세요.
                </p>
                <input
                  type="text"
                  value={withdrawConfirm}
                  onChange={(e) => setWithdrawConfirm(e.target.value)}
                  placeholder="탈퇴"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-center focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 transition-colors"
                  autoFocus
                />
              </div>
              {withdrawError && (
                <p className="text-xs text-red-500 text-center mb-3">{withdrawError}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setWithdrawOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-semibold rounded-xl transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleWithdraw}
                  disabled={withdrawConfirm !== "탈퇴" || withdrawing}
                  className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-colors"
                >
                  {withdrawing ? "처리 중..." : "탈퇴하기"}
                </button>
              </div>
            </div>
          </div>
        )}

      </DashboardLayout>
    </>
  );
}
