import { useEffect, useRef, useState } from "react";

interface CounterProps {
  end: number;
  suffix: string;
  duration?: number;
}

function AnimatedCounter({ end, suffix, duration = 2200 }: CounterProps) {
  const [count, setCount] = useState(0);
  const spanRef = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const run = () => {
      if (started.current) return;
      started.current = true;
      let startTs: number | null = null;

      const tick = (ts: number) => {
        if (!startTs) startTs = ts;
        const elapsed = ts - startTs;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(Math.floor(eased * end));
        if (progress < 1) requestAnimationFrame(tick);
        else setCount(end);
      };

      requestAnimationFrame(tick);
    };

    /* 뷰포트에 보이면 즉시, 보이지 않으면 마운트 후 300ms 뒤 강제 시작 */
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) run(); },
      { threshold: 0.1 }
    );

    if (spanRef.current) observer.observe(spanRef.current);
    const fallback = setTimeout(run, 300);

    return () => {
      observer.disconnect();
      clearTimeout(fallback);
    };
  }, [end, duration]);

  return (
    <span ref={spanRef} className="tabular-nums">
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

const MAIN_STATS = [
  {
    end: 47,
    suffix: "명",
    label: "현재 활동 중인 리더",
    sub: "AI 시민 리더 강사",
    icon: "🏅",
    primary: true,
  },
  {
    end: 156,
    suffix: "회",
    label: "누적 교육 횟수",
    sub: "강의 진행 완료",
    icon: "📚",
    primary: true,
  },
];

const SUB_STATS = [
  { end: 638, suffix: "명", label: "총 수강생", icon: "👥" },
  { end: 31,  suffix: "건", label: "강사 파견 완료", icon: "✅" },
  { end: 12,  suffix: "개", label: "개설 과정", icon: "📋" },
];

export default function LiveCountBanner() {
  return (
    <section
      id="stats"
      className="relative bg-gradient-to-br from-hwaseong-blue via-[#003fa3] to-hwaseong-skyblue text-white overflow-hidden py-14"
    >
      {/* Decorative circles */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full bg-white/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-500/10" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-2 bg-white/15 border border-white/25 text-xs font-semibold px-4 py-1.5 rounded-full mb-4 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            LIVE · 실시간 플랫폼 현황
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold leading-tight">
            화성 AI 시민 리더,{" "}
            <span className="text-yellow-300">지금 이 순간도 성장 중</span>
          </h2>
          <p className="text-blue-200 text-sm mt-2">2026년 화성특례시 AI 혁신학교 AI랩 누적 데이터</p>
        </div>

        {/* Primary stats — big cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl mx-auto mb-6">
          {MAIN_STATS.map((s) => (
            <div
              key={s.label}
              className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-3xl p-7 text-center shadow-xl hover:-translate-y-1 transition-transform"
            >
              <span className="text-4xl block mb-3">{s.icon}</span>
              <p className="text-5xl sm:text-6xl font-bold mb-2 drop-shadow">
                <AnimatedCounter end={s.end} suffix={s.suffix} duration={2200} />
              </p>
              <p className="font-semibold text-base">{s.label}</p>
              <p className="text-blue-200 text-xs mt-1">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Secondary stats — small cards */}
        <div className="grid grid-cols-3 gap-3 max-w-xl mx-auto">
          {SUB_STATS.map((s) => (
            <div
              key={s.label}
              className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4 text-center hover:-translate-y-0.5 transition-transform"
            >
              <span className="text-2xl block mb-1">{s.icon}</span>
              <p className="text-2xl font-bold">
                <AnimatedCounter end={s.end} suffix={s.suffix} duration={1800} />
              </p>
              <p className="text-blue-200 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
