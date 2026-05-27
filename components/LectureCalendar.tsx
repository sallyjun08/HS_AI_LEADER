import { useState, useMemo, useEffect } from "react";

export type CalendarMatch = {
  id: string;
  title: string;
  start_date: string;
  end_date: string | null;
  status: string;
  lecture_type: string | null;
  session_count: number | null;
  lecture_times: { date?: string; day?: string; startTime?: string; start?: string }[] | null;
};

const TYPE_COLOR: Record<string, string> = {
  oneday:    "bg-blue-400",
  intensive: "bg-yellow-400",
  longterm:  "bg-green-400",
};
const TYPE_LABEL: Record<string, string> = {
  oneday: "원데이형", intensive: "집중코스형", longterm: "장기정기형",
};
const DAY_IDX: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

type CalEntry = {
  id: string;
  title: string;
  lecture_type: string | null;
  time?: string;
  preview: boolean;
  highlight: boolean;
};

function expandDates(
  m: CalendarMatch,
  preview: boolean,
  highlight: boolean,
  push: (date: string, entry: CalEntry) => void,
) {
  const entry: CalEntry = { id: m.id, title: m.title, lecture_type: m.lecture_type, preview, highlight };
  const slots = m.lecture_times ?? [];

  if (m.lecture_type === "oneday") {
    push(m.start_date, { ...entry, time: slots[0]?.startTime ?? slots[0]?.start });

  } else if (m.lecture_type === "intensive") {
    const specific = slots.map((s) => s.date).filter(Boolean) as string[];
    if (specific.length > 0) {
      specific.forEach((d) => push(d, { ...entry, time: slots.find((s) => s.date === d)?.startTime }));
    } else {
      // lecture_times에 날짜 없으면 start_date부터 연속 전개
      // end_date가 있으면 그 범위, 없으면 session_count일만큼
      const time = slots[0]?.startTime ?? slots[0]?.start;
      const endDate  = m.end_date ? new Date(m.end_date) : null;
      const maxDays  = m.session_count ?? 1;
      const cur = new Date(m.start_date);
      let count = 0;
      while (count < maxDays && (!endDate || cur <= endDate)) {
        push(cur.toISOString().slice(0, 10), { ...entry, time });
        cur.setDate(cur.getDate() + 1);
        count++;
      }
    }

  } else if (m.lecture_type === "longterm") {
    const specific = slots.map((s) => s.date).filter(Boolean) as string[];
    if (specific.length > 0) {
      specific.forEach((d) => push(d, { ...entry, time: slots.find((s) => s.date === d)?.startTime }));
    } else {
      const recurDays = slots.map((s) => s.day).filter(Boolean).map((d) => DAY_IDX[d!]).filter((n) => !isNaN(n));
      if (recurDays.length > 0) {
        const time   = slots[0]?.startTime ?? slots[0]?.start;
        const endDate = m.end_date ? new Date(m.end_date) : null;
        const maxCount = m.session_count ?? 0;
        const cur = new Date(m.start_date);
        let count = 0;
        let iterations = 0;
        while (iterations < 1000) {
          if (endDate ? cur > endDate : count >= maxCount) break;
          if (recurDays.includes(cur.getDay())) {
            push(cur.toISOString().slice(0, 10), { ...entry, time });
            count++;
          }
          cur.setDate(cur.getDate() + 1);
          iterations++;
        }
      } else {
        push(m.start_date, entry);
      }
    }
  }
}

function buildDateMap(
  confirmed: CalendarMatch[],
  highlightId?: string,
  previewMatch?: CalendarMatch,
): Map<string, CalEntry[]> {
  const map = new Map<string, CalEntry[]>();
  const push = (date: string, entry: CalEntry) => {
    if (!map.has(date)) map.set(date, []);
    map.get(date)!.push(entry);
  };

  for (const m of confirmed) {
    if (m.status !== "ongoing" && m.status !== "matched") continue;
    expandDates(m, false, m.id === highlightId, push);
  }

  if (previewMatch) {
    expandDates(previewMatch, true, false, push);
  }

  return map;
}

export default function LectureCalendar({
  matches,
  highlightId,
  previewMatch,
  previewLabel,
}: {
  matches: CalendarMatch[];
  highlightId?: string;
  previewMatch?: CalendarMatch;
  previewLabel?: string;
}) {
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selected,  setSelected]  = useState<string | null>(null);

  // previewMatch의 시작일이 바뀌면 해당 월로 자동 이동
  useEffect(() => {
    if (!previewMatch?.start_date) return;
    const d = new Date(previewMatch.start_date + "T00:00:00");
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setSelected(null);
  }, [previewMatch?.start_date]);

  const dateMap = useMemo(
    () => buildDateMap(matches, highlightId, previewMatch),
    [matches, highlightId, previewMatch],
  );

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
    setSelected(null);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
    setSelected(null);
  };

  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const todayStr    = today.toISOString().slice(0, 10);

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const selectedEntries = selected ? (dateMap.get(selected) ?? []) : [];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide">강의 일정</h4>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 text-sm">‹</button>
          <span className="text-sm font-bold text-hwaseong-text tabular-nums">
            {viewYear}. {String(viewMonth + 1).padStart(2, "0")}
          </span>
          <button onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 text-sm">›</button>
        </div>
      </div>

      <div className="p-3">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 mb-1">
          {["일","월","화","수","목","금","토"].map((d, i) => (
            <div key={d} className={`text-center text-[10px] font-bold py-1 ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-gray-400"}`}>
              {d}
            </div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7 gap-y-0.5">
          {cells.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} />;
            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const entries       = dateMap.get(dateStr) ?? [];
            const confirmed     = entries.filter((e) => !e.preview);
            const hasPreview    = entries.some((e) => e.preview);
            const highlightEntry = confirmed.find((e) => e.highlight);
            const isToday       = dateStr === todayStr;
            const isSelected    = dateStr === selected;
            const dow           = (firstDay + day - 1) % 7;
            const hasAny        = entries.length > 0;

            const highlightCellBg = highlightEntry ? (
              highlightEntry.lecture_type === "oneday"    ? "bg-blue-100 hover:bg-blue-200" :
              highlightEntry.lecture_type === "intensive" ? "bg-yellow-100 hover:bg-yellow-200" :
              highlightEntry.lecture_type === "longterm"  ? "bg-green-100 hover:bg-green-200" :
                                                            "bg-gray-100 hover:bg-gray-200"
            ) : "";

            return (
              <button
                key={dateStr}
                onClick={() => setSelected(isSelected ? null : dateStr)}
                className={`relative flex flex-col items-center py-1.5 rounded-xl transition-colors ${
                  isSelected      ? "bg-hwaseong-blue/10" :
                  highlightEntry  ? highlightCellBg :
                  hasPreview      ? "bg-amber-50 hover:bg-amber-100" :
                  hasAny          ? "hover:bg-gray-50" : ""
                }`}
              >
                <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  isToday    ? "bg-hwaseong-blue text-white font-black" :
                  isSelected ? "text-hwaseong-blue font-black" :
                  dow === 0  ? "text-red-400" :
                  dow === 6  ? "text-blue-400" :
                               "text-gray-700"
                }`}>
                  {day}
                </span>
                {/* 도트 행: 확정(좌) + 예정(우) */}
                {(confirmed.length > 0 || hasPreview) && (
                  <div className="flex gap-0.5 mt-0.5 justify-center">
                    {confirmed.slice(0, 2).map((e, i) => (
                      <span key={i} className={`w-1.5 h-1.5 rounded-full ${TYPE_COLOR[e.lecture_type ?? ""] ?? "bg-gray-400"} ${!e.highlight ? "opacity-50" : ""}`} />
                    ))}
                    {hasPreview && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ring-1 ring-amber-500" />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* 범례 */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 px-1">
          {matches.length > 0 && Object.entries(TYPE_LABEL).map(([key, label]) => (
            <div key={key} className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${TYPE_COLOR[key]}`} />
              <span className="text-[10px] text-gray-400">{label}</span>
            </div>
          ))}
          {previewMatch && (
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 ring-1 ring-amber-500" />
              <span className="text-[10px] text-amber-600 font-semibold">{previewLabel ?? "수락 시 추가"}</span>
            </div>
          )}
        </div>
      </div>

      {/* 선택된 날 강의 목록 */}
      {selected && (
        <div className="border-t border-gray-100 px-4 py-3 space-y-2">
          <p className="text-[11px] font-bold text-gray-400">
            {Number(selected.slice(5, 7))}월 {Number(selected.slice(8, 10))}일 강의
          </p>
          {selectedEntries.length === 0 ? (
            <p className="text-xs text-gray-300">강의가 없습니다.</p>
          ) : (
            selectedEntries.map((e, i) => (
              <div key={`${e.id}-${i}`} className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl border ${
                e.preview    ? "bg-amber-50 border-amber-100" :
                e.highlight  ? "bg-hwaseong-blue/5 border-hwaseong-blue/20 shadow-sm" :
                               "border-transparent opacity-60"
              }`}>
                <span className={`w-2 h-7 rounded-full flex-shrink-0 ${
                  e.preview   ? "bg-amber-400" :
                  e.highlight ? (TYPE_COLOR[e.lecture_type ?? ""] ?? "bg-gray-300") :
                                "bg-gray-200"
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className={`text-xs truncate ${e.highlight ? "font-bold text-hwaseong-text" : "font-medium text-gray-400"}`}>{e.title}</p>
                    {e.preview && (
                      <span className="text-[9px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full flex-shrink-0">{previewLabel ?? "수락 시 추가"}</span>
                    )}
                    {e.highlight && (
                      <span className="text-[9px] font-bold text-hwaseong-blue bg-hwaseong-blue/10 px-1.5 py-0.5 rounded-full flex-shrink-0">이 강의</span>
                    )}
                  </div>
                  <p className={`text-[10px] ${e.highlight ? "text-gray-500 font-medium" : "text-gray-400"}`}>
                    {TYPE_LABEL[e.lecture_type ?? ""] ?? "—"}{e.time ? `  ·  ${e.time}` : ""}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
