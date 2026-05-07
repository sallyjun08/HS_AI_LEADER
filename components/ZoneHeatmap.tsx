/**
 * 권역별 교육 수요 히트맵 — Chart.js + chartjs-chart-matrix
 *
 * 사용 예시:
 *   import ZoneHeatmap from "@/components/ZoneHeatmap";
 *   <ZoneHeatmap />
 *
 * 데이터 교체: DEMAND 배열의 숫자를 실제 DB 집계값으로 대체하면 됩니다.
 */
import { useEffect, useRef } from "react";

/* ── 축 레이블 ──────────────────────────────────────────────── */
export const ZONES  = ["동탄 권역", "병점·진안 권역", "봉담·매송 권역", "향남·우정 권역", "남양·마도 권역", "팔탄·장안 권역"];
export const MONTHS = ["1월", "2월", "3월", "4월", "5월", "6월"];

/**
 * 교육 수요 건수 행렬 [zone_index][month_index]
 * 행: 권역 (ZONES 순서), 열: 월 (MONTHS 순서)
 */
export const DEMAND: number[][] = [
  [2,  5,  8, 12, 18, 22],  // 동탄 권역     — 동탄신도시 급성장 반영
  [1,  3,  5,  8, 11, 15],  // 병점·진안 권역
  [1,  2,  3,  4,  6,  8],  // 봉담·매송 권역
  [0,  1,  2,  3,  4,  6],  // 향남·우정 권역
  [1,  2,  3,  5,  7,  9],  // 남양·마도 권역
  [0,  1,  2,  3,  5,  7],  // 팔탄·장안 권역
];

const MAX_V = Math.max(...DEMAND.flat());

/** 수요 강도에 따라 파란색 계열 rgba 반환 */
function heatColor(v: number, alpha = true): string {
  const t = v / MAX_V;
  if (alpha) return `rgba(0, 102, 204, ${(0.08 + t * 0.84).toFixed(2)})`;
  const l = Math.round(255 - t * 200);
  return `rgb(${l},${Math.round(l * 0.85)},255)`;
}

/* ── Chart.js 커스텀 플러그인: 히트맵 셀 렌더링 ─────────────── */
const heatmapDrawPlugin = {
  id: "zoneHeatmapDraw",
  beforeDraw(chart: any) {
    const { ctx, chartArea } = chart;
    if (!chartArea) return;

    const { left, top, width, height } = chartArea;
    const cellW = width  / MONTHS.length;
    const cellH = height / ZONES.length;
    const pad   = 3;
    const radius = 5;

    [...ZONES].reverse().forEach((_, ri) => {
      const zoneIdx = ZONES.length - 1 - ri;
      MONTHS.forEach((_, mi) => {
        const v  = DEMAND[zoneIdx][mi];
        const px = left + mi * cellW + pad;
        const py = top  + ri * cellH + pad;
        const cw = cellW - pad * 2;
        const ch = cellH - pad * 2;

        /* 셀 배경 */
        ctx.save();
        ctx.beginPath();
        ctx.roundRect
          ? ctx.roundRect(px, py, cw, ch, radius)
          : ctx.rect(px, py, cw, ch);
        ctx.fillStyle = heatColor(v);
        ctx.fill();

        /* 수요 건수 텍스트 */
        const t = v / MAX_V;
        ctx.fillStyle   = t > 0.45 ? "#ffffff" : "#1e3a5f";
        ctx.font        = `bold ${Math.min(13, ch * 0.38)}px 'Noto Sans KR', sans-serif`;
        ctx.textAlign   = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${v}건`, px + cw / 2, py + ch / 2);
        ctx.restore();
      });
    });
  },
};

/* ── 메인 컴포넌트 ────────────────────────────────────────────── */
export default function ZoneHeatmap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef  = useRef<any>(null);

  useEffect(() => {
    let active = true;

    /**
     * Chart.js + chartjs-chart-matrix 동적 임포트
     * — SSR·정적 내보내기 환경에서 안전하게 로드
     */
    async function init() {
      const [{ Chart, CategoryScale, LinearScale, Tooltip, Legend }, { MatrixController, MatrixElement }] =
        await Promise.all([
          import("chart.js"),
          import("chartjs-chart-matrix"),
        ]);

      if (!active || !canvasRef.current) return;

      /* 필요한 컴포넌트 등록 */
      Chart.register(CategoryScale, LinearScale, Tooltip, Legend, MatrixController, MatrixElement);

      /* 히트맵 데이터: { x: 월, y: 권역, v: 수요건수 } */
      const matrixData = ZONES.flatMap((zone, zi) =>
        MONTHS.map((month, mi) => ({ x: month, y: zone, v: DEMAND[zi][mi] }))
      );

      chartRef.current = new Chart(canvasRef.current!, {
        type: "matrix" as any,
        data: {
          datasets: [
            {
              label: "교육 수요 (건)",
              data: matrixData,
              /* backgroundColor: 수요 강도에 따라 동적 색상 */
              backgroundColor(ctx: any) {
                const v: number = (ctx.dataset.data[ctx.dataIndex] as any)?.v ?? 0;
                return heatColor(v);
              },
              borderColor: "#ffffff",
              borderWidth: 2,
              /* 셀 크기: 차트 영역을 균등 분할 */
              width : ({ chart }: any) => (chart.chartArea?.width  ?? 300) / MONTHS.length - 3,
              height: ({ chart }: any) => (chart.chartArea?.height ?? 240) / ZONES.length  - 3,
            },
          ],
        },
        options: {
          responsive:          true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title : () => "",
                label : (ctx: any) => {
                  const d = ctx.dataset.data[ctx.dataIndex] as any;
                  return ` ${d.y}  ·  ${d.x} : ${d.v}건`;
                },
              },
            },
          },
          scales: {
            x: {
              type    : "category",
              labels  : MONTHS,
              position: "bottom",
              grid    : { display: false },
              ticks   : { font: { size: 11 } },
            },
            y: {
              type    : "category",
              labels  : [...ZONES].reverse(), // 위쪽이 동탄 권역
              position: "left",
              grid    : { display: false },
              ticks   : { font: { size: 11 }, padding: 4 },
            },
          },
        },
      });
    }

    init().catch(() => {
      /* chartjs-chart-matrix 로드 실패 시 커스텀 플러그인으로 폴백 */
      if (!active || !canvasRef.current) return;
      import("chart.js/auto").then(({ Chart }) => {
        if (!active || !canvasRef.current) return;
        chartRef.current = new Chart(canvasRef.current!, {
          type   : "bar",
          data   : { labels: MONTHS, datasets: [] },
          plugins: [heatmapDrawPlugin],
          options: {
            responsive         : true,
            maintainAspectRatio: false,
            layout             : { padding: { left: 10 } },
            plugins : { legend: { display: false }, tooltip: { enabled: false } },
            scales  : {
              x: { grid: { display: false }, ticks: { font: { size: 11 } } },
              y: { display: false },
            },
          },
        });
      });
    });

    return () => {
      active = false;
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, []);

  return (
    <div className="relative" style={{ height: 264 }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
