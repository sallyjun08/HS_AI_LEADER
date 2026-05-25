import Head from "next/head";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/lib/auth-context";
import DashboardLayout from "@/components/DashboardLayout";

type RentalItem = {
  id: string;
  type: "venue" | "equipment";
  name: string;
  address: string | null;
  capacity: number | null;
  features: string[];
  fee_per_use: number;
  fee_unit: string;
  max_quantity: number | null;
  available: boolean;
  available_slots: { days: string[]; start: string; end: string } | null;
};

const WEEKDAYS = [
  { key: "mon", label: "월" }, { key: "tue", label: "화" }, { key: "wed", label: "수" },
  { key: "thu", label: "목" }, { key: "fri", label: "금" }, { key: "sat", label: "토" }, { key: "sun", label: "일" },
];

const EMPTY_FORM = {
  type: "venue" as "venue" | "equipment",
  name: "", address: "", capacity: "", features: [] as string[], featureInput: "",
  fee_per_use: "0", fee_unit: "회", max_quantity: "", available: true,
  slots_days: ["mon", "tue", "wed", "thu", "fri"],
  slots_start: "09:00", slots_end: "18:00", use_slots: true,
};

type FormState = typeof EMPTY_FORM;

function toForm(item: RentalItem): FormState {
  return {
    type: item.type,
    name: item.name,
    address: item.address ?? "",
    capacity: item.capacity != null ? String(item.capacity) : "",
    features: [...item.features],
    featureInput: "",
    fee_per_use: String(item.fee_per_use),
    fee_unit: item.fee_unit,
    max_quantity: item.max_quantity != null ? String(item.max_quantity) : "",
    available: item.available,
    slots_days: item.available_slots?.days ?? ["mon","tue","wed","thu","fri"],
    slots_start: item.available_slots?.start ?? "09:00",
    slots_end: item.available_slots?.end ?? "18:00",
    use_slots: item.available_slots != null,
  };
}

function toBody(form: FormState) {
  return {
    type: form.type,
    name: form.name.trim(),
    address: form.type === "venue" ? (form.address.trim() || null) : undefined,
    capacity: form.type === "venue" && form.capacity !== "" ? Number(form.capacity) : null,
    features: form.features,
    fee_per_use: Number(form.fee_per_use) || 0,
    fee_unit: form.fee_unit.trim() || (form.type === "equipment" ? "대·회" : "회"),
    max_quantity: form.type === "equipment" && form.max_quantity !== "" ? Number(form.max_quantity) : null,
    available: form.available,
    available_slots: form.type === "venue" && form.use_slots
      ? { days: form.slots_days, start: form.slots_start, end: form.slots_end }
      : null,
  };
}

export default function RentalSettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [items, setItems] = useState<RentalItem[]>([]);
  const [fetching, setFetching] = useState(true);
  const [tab, setTab] = useState<"venue" | "equipment">("venue");

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<RentalItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<RentalItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (user) fetchItems();
  }, [user]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  async function fetchItems() {
    setFetching(true);
    const res = await fetch("/api/admin/rental-settings");
    const data = await res.json().catch(() => []);
    if (Array.isArray(data)) setItems(data);
    setFetching(false);
  }

  function openCreate() {
    const base = { ...EMPTY_FORM, type: tab, fee_unit: tab === "equipment" ? "대·회" : "회" };
    setForm(base);
    setEditTarget(null);
    setFormError(null);
    setModalMode("create");
  }

  function openEdit(item: RentalItem) {
    setForm(toForm(item));
    setEditTarget(item);
    setFormError(null);
    setModalMode("edit");
  }

  function setF<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function addFeature() {
    const v = form.featureInput.trim();
    if (!v || form.features.includes(v)) return;
    setForm((p) => ({ ...p, features: [...p.features, v], featureInput: "" }));
  }

  async function handleSave() {
    if (!form.name.trim()) return setFormError("이름을 입력해 주세요.");
    setFormError(null);
    setSaving(true);

    const body = toBody(form);
    const url = modalMode === "edit" && editTarget
      ? `/api/admin/rental-settings/${editTarget.id}`
      : "/api/admin/rental-settings";
    const method = modalMode === "edit" ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const saved: RentalItem = await res.json();
      setItems((prev) =>
        modalMode === "edit"
          ? prev.map((i) => (i.id === saved.id ? saved : i))
          : [...prev, saved]
      );
      setToast({ msg: modalMode === "edit" ? "수정됐습니다." : "추가됐습니다.", ok: true });
      setModalMode(null);
    } else {
      const d = await res.json().catch(() => ({}));
      setFormError((d as { error?: string }).error ?? "저장에 실패했습니다.");
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/rental-settings/${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      setToast({ msg: `"${deleteTarget.name}"이 삭제됐습니다.`, ok: true });
      setDeleteTarget(null);
    } else {
      setToast({ msg: "삭제에 실패했습니다.", ok: false });
    }
    setDeleting(false);
  }

  async function toggleAvailable(item: RentalItem) {
    const res = await fetch(`/api/admin/rental-settings/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available: !item.available }),
    });
    if (res.ok) {
      const updated: RentalItem = await res.json();
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    }
  }

  const listed = items.filter((i) => i.type === tab);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-hwaseong-blue border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <>
      <Head><title>대여 설정 | 화성 AI 시민리더 잇다</title></Head>
      <DashboardLayout pageTitle="공간·장비 대여 설정">

        {toast && (
          <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold text-white ${toast.ok ? "bg-green-600" : "bg-red-500"}`}>
            {toast.ok ? "✅ " : "⚠️ "}{toast.msg}
          </div>
        )}

        {/* 헤더 */}
        <div className="bg-gradient-to-br from-teal-600 to-cyan-600 rounded-3xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">🏢</div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-black text-white">공간·장비 대여 설정</h2>
            <p className="text-teal-100 text-xs mt-0.5">대여 가능한 공간과 장비를 추가·수정·삭제합니다.</p>
          </div>
          <button
            onClick={openCreate}
            className="flex-shrink-0 flex items-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/30 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
          >
            + 추가
          </button>
        </div>

        {/* 탭 */}
        <div className="flex gap-2">
          {(["venue", "equipment"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-colors ${
                tab === t ? "bg-hwaseong-blue text-white shadow-sm" : "bg-white border border-gray-200 text-gray-500 hover:border-hwaseong-blue"
              }`}
            >
              {t === "venue" ? "🏛 공간" : "💻 장비"}
              <span className="ml-1.5 text-xs font-normal opacity-70">
                {items.filter((i) => i.type === t).length}
              </span>
            </button>
          ))}
        </div>

        {/* 목록 */}
        {fetching ? (
          <div className="flex items-center justify-center py-20 text-gray-300">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-teal-500 rounded-full animate-spin mr-3" /> 로딩 중...
          </div>
        ) : listed.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-gray-100">
            <p className="text-4xl mb-3">{tab === "venue" ? "🏛" : "💻"}</p>
            <p className="font-bold text-gray-400">등록된 {tab === "venue" ? "공간" : "장비"}이 없습니다.</p>
            <button onClick={openCreate} className="mt-4 text-sm text-hwaseong-blue underline">+ 추가하기</button>
          </div>
        ) : (
          <div className="space-y-3">
            {listed.map((item) => (
              <div key={item.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${item.available ? "border-gray-100" : "border-gray-100 opacity-60"}`}>
                <div className="px-5 py-4 flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${tab === "venue" ? "bg-teal-50" : "bg-cyan-50"}`}>
                    {tab === "venue" ? "🏛" : "💻"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-hwaseong-text text-sm">{item.name}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.available ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {item.available ? "이용 가능" : "이용 불가"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
                      {item.address && <span>📍 {item.address}</span>}
                      {item.capacity != null && <span>👥 최대 {item.capacity}명</span>}
                      {item.max_quantity != null && <span>📦 최대 {item.max_quantity}{item.fee_unit.includes("대") ? "대" : "개"}</span>}
                      <span>💰 {item.fee_per_use.toLocaleString()}원/{item.fee_unit}</span>
                      {item.available_slots && (
                        <span>🕐 {item.available_slots.days.map((d) => WEEKDAYS.find((w) => w.key === d)?.label).join("·")} {item.available_slots.start}–{item.available_slots.end}</span>
                      )}
                    </div>
                    {item.features.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.features.map((f) => (
                          <span key={f} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{f}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button onClick={() => openEdit(item)} className="px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-hwaseong-light hover:text-hwaseong-blue rounded-lg transition-colors">수정</button>
                    <button onClick={() => toggleAvailable(item)} className="px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-yellow-50 hover:text-yellow-700 rounded-lg transition-colors">
                      {item.available ? "비활성" : "활성화"}
                    </button>
                    <button onClick={() => setDeleteTarget(item)} className="px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors">삭제</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 편집/추가 모달 */}
        {modalMode && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg my-4">
              <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-black text-hwaseong-text text-lg">
                  {modalMode === "create" ? "항목 추가" : "항목 수정"}
                </h3>
                <button onClick={() => setModalMode(null)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors">✕</button>
              </div>

              <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">

                {/* 유형 (추가 시만) */}
                {modalMode === "create" && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">유형</label>
                    <div className="flex gap-2">
                      {(["venue", "equipment"] as const).map((t) => (
                        <button key={t} type="button"
                          onClick={() => { setF("type", t); setF("fee_unit", t === "equipment" ? "대·회" : "회"); }}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                            form.type === t ? "bg-hwaseong-blue border-hwaseong-blue text-white" : "bg-gray-50 border-gray-200 text-gray-500 hover:border-hwaseong-blue"
                          }`}
                        >
                          {t === "venue" ? "🏛 공간" : "💻 장비"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 이름 */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">이름 <span className="text-red-400">*</span></label>
                  <input type="text" value={form.name} onChange={(e) => setF("name", e.target.value)}
                    placeholder={form.type === "venue" ? "예: 동탄복합문화센터 교육실 A" : "예: 노트북"}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30 focus:border-hwaseong-blue transition-colors"
                  />
                </div>

                {/* 공간 전용 필드 */}
                {form.type === "venue" && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">주소</label>
                      <input type="text" value={form.address} onChange={(e) => setF("address", e.target.value)}
                        placeholder="예: 경기도 화성시 동탄면로 164"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30 focus:border-hwaseong-blue transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">최대 수용 인원</label>
                      <input type="number" min="1" value={form.capacity} onChange={(e) => setF("capacity", e.target.value)}
                        placeholder="예: 30"
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30 focus:border-hwaseong-blue transition-colors"
                      />
                    </div>

                    {/* 운영 요일·시간 */}
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-gray-600">운영 요일·시간</span>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={form.use_slots}
                            onChange={(e) => setF("use_slots", e.target.checked)}
                            className="w-4 h-4 accent-hwaseong-blue"
                          />
                          <span className="text-xs text-gray-500">설정 사용</span>
                        </label>
                      </div>
                      {form.use_slots && (
                        <>
                          <div className="flex gap-1.5 mb-3 flex-wrap">
                            {WEEKDAYS.map(({ key, label }) => {
                              const active = form.slots_days.includes(key);
                              return (
                                <button key={key} type="button"
                                  onClick={() => setF("slots_days", active ? form.slots_days.filter((d) => d !== key) : [...form.slots_days, key])}
                                  className={`w-9 h-9 rounded-xl text-xs font-bold border transition-colors ${active ? "bg-hwaseong-blue border-hwaseong-blue text-white" : "bg-white border-gray-200 text-gray-500 hover:border-hwaseong-blue"}`}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="time" value={form.slots_start} onChange={(e) => setF("slots_start", e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30 transition-colors"
                            />
                            <span className="text-xs text-gray-400">~</span>
                            <input type="time" value={form.slots_end} onChange={(e) => setF("slots_end", e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30 transition-colors"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}

                {/* 장비 전용 필드 */}
                {form.type === "equipment" && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">최대 수량</label>
                    <input type="number" min="1" value={form.max_quantity} onChange={(e) => setF("max_quantity", e.target.value)}
                      placeholder="예: 30"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30 focus:border-hwaseong-blue transition-colors"
                    />
                  </div>
                )}

                {/* 특징 태그 */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">특징</label>
                  <div className="flex gap-2 mb-2">
                    <input type="text" value={form.featureInput}
                      onChange={(e) => setF("featureInput", e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFeature(); } }}
                      placeholder="예: 빔프로젝터 (Enter로 추가)"
                      className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30 focus:border-hwaseong-blue transition-colors"
                    />
                    <button type="button" onClick={addFeature}
                      className="px-4 py-2.5 bg-gray-100 hover:bg-hwaseong-light text-gray-600 text-xs font-semibold rounded-xl transition-colors"
                    >
                      추가
                    </button>
                  </div>
                  {form.features.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {form.features.map((f) => (
                        <span key={f} className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                          {f}
                          <button type="button" onClick={() => setF("features", form.features.filter((x) => x !== f))}
                            className="text-gray-400 hover:text-red-500 transition-colors leading-none"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 요금 */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">요금 (원)</label>
                    <input type="number" min="0" value={form.fee_per_use} onChange={(e) => setF("fee_per_use", e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30 transition-colors"
                    />
                  </div>
                  <div className="w-28">
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">단위</label>
                    <input type="text" value={form.fee_unit} onChange={(e) => setF("fee_unit", e.target.value)}
                      placeholder="회"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-hwaseong-blue/30 transition-colors"
                    />
                  </div>
                </div>

                {/* 이용 가능 여부 */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.available}
                    onChange={(e) => setF("available", e.target.checked)}
                    className="w-4 h-4 accent-hwaseong-blue"
                  />
                  <span className="text-sm text-gray-600 font-medium">이용 가능</span>
                </label>

                {formError && (
                  <p className="text-xs text-red-500">{formError}</p>
                )}
              </div>

              <div className="px-6 pb-6 flex gap-2 border-t border-gray-100 pt-4">
                <button onClick={() => setModalMode(null)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-semibold rounded-xl transition-colors"
                >
                  취소
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-3 bg-hwaseong-blue hover:bg-blue-900 disabled:opacity-60 text-white text-sm font-bold rounded-xl transition-colors"
                >
                  {saving ? "저장 중..." : modalMode === "create" ? "추가하기" : "저장하기"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 삭제 확인 모달 */}
        {deleteTarget && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center">
              <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4">🗑️</div>
              <h3 className="font-black text-gray-800 text-base mb-1">항목을 삭제할까요?</h3>
              <p className="text-sm text-gray-500 mb-6">
                <span className="font-semibold text-gray-700">"{deleteTarget.name}"</span>이 영구 삭제됩니다.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-semibold rounded-xl transition-colors"
                >
                  취소
                </button>
                <button onClick={handleDelete} disabled={deleting}
                  className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-colors"
                >
                  {deleting ? "삭제 중..." : "삭제"}
                </button>
              </div>
            </div>
          </div>
        )}

      </DashboardLayout>
    </>
  );
}
