import Head from "next/head";
import { useState } from "react";
import dynamic from "next/dynamic";
import DashboardLayout from "@/components/DashboardLayout";
import { MONTHLY_STATS, MOCK_MATCH_REQUESTS, MOCK_COURSES } from "@/lib/mock-data";
import { ZONES, MONTHS, DEMAND } from "@/components/ZoneHeatmap";

/* ZoneHeatmap은 Chart.js 캔버스 — SSR 없이 클라이언트에서만 렌더링 */
const ZoneHeatmap = dynamic(() => import("@/components/ZoneHeatmap"), { ssr: false });

/* ── 강사료 목 데이터 ──────────────────────────────────────── */
const FEE_DATA = [
  { name: "박준호", expertise: "생성형 AI·업무 자동화", sessions: 12, feePerSession: 300_000 },
  { name: "이서연", expertise: "AI 윤리·공공행정",       sessions:  8, feePerSession: 280_000 },
  { name: "김민준", expertise: "AI 기초·디지털 리터러시",sessions: 15, feePerSession: 250_000 },
  { name: "최유진", expertise: "창업·생성형 AI",          sessions:  6, feePerSession: 290_000 },
];

/* ── 이번 달 강사료 증빙 CSV 생성 ─────────────────────────── */
function downloadFeeCSV() {
  const now    = new Date();
  const month  = `${now.getFullYear()}년 ${now.getMonth() + 1}월`;
  const BOM    = "﻿";
  const header = "강사명,전문분야,강의횟수,회당강사료(원),합계(원),비고\n";
  const rows   = FEE_DATA.map((r) =>
    `${r.name},${r.expertise},${r.sessions},${r.feePerSession.toLocaleString()},${(r.sessions * r.feePerSession).toLocaleString()},지급 예정`
  ).join("\n");
  const total  = FEE_DATA.reduce((s, r) => s + r.sessions * r.feePerSession, 0);
  const footer = `\n합계,,,,${total.toLocaleString()},`;

  const blob = new Blob([BOM + header + rows + footer], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `화성시_강사료증빙_${month}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ── 연간 성과 보고서 PDF (브라우저 인쇄 대화상자 활용) ────── */
function downloadAnnualReport() {
  const totalLearners  = MONTHLY_STATS.reduce((s, m) => s + m.learners, 0);
  const totalSessions  = MONTHLY_STATS.reduce((s, m) => s + m.sessions, 0);
  const completedCount = MOCK_MATCH_REQUESTS.filter((r) => r.status === "completed").length;
  const totalFee       = FEE_DATA.reduce((s, r) => s + r.sessions * r.feePerSession, 0);

  const zoneRows = ZONES.map((zone, zi) => {
    const total = DEMAND[zi].reduce((s, v) => s + v, 0);
    return `<tr><td>${zone}</td><td>${total}건</td><td>${MONTHS[DEMAND[zi].indexOf(Math.max(...DEMAND[zi]))]}</td></tr>`;
  }).join("");

  const html = `<!DOCTYPE html><html lang="ko"><head>
  <meta charset="UTF-8"/>
  <title>화성시 AI 시민 리더 허브 연간 성과 보고서</title>
  <style>
    body { font-family: 'Noto Sans KR', sans-serif; padding: 40px; color: #1e293b; }
    h1   { color: #003087; border-bottom: 3px solid #003087; padding-bottom: 8px; }
    h2   { color: #0066cc; margin-top: 28px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; margin: 20px 0; }
    .kpi { background: #f0f4ff; border-radius: 12px; padding: 16px; text-align: center; }
    .kpi .val { font-size: 28px; font-weight: 700; color: #003087; }
    .kpi .lbl { font-size: 12px; color: #64748b; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th    { background: #003087; color: white; padding: 8px 12px; text-align: left; font-size: 13px; }
    td    { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
    tr:nth-child(even) td { background: #f8fafc; }
    .footer { margin-top: 40px; font-size: 11px; color: #94a3b8; text-align: center; }
  </style></head><body>
  <h1>화성시 AI 시민 리더 허브<br/>2026년 상반기 성과 보고서</h1>
  <p style="color:#64748b;font-size:13px;">작성일: ${new Date().toLocaleDateString("ko-KR")} | 화성시 AI스마트전략실</p>

  <div class="kpi-grid">
    <div class="kpi"><div class="val">${totalSessions}</div><div class="lbl">총 강의 횟수</div></div>
    <div class="kpi"><div class="val">${totalLearners}</div><div class="lbl">누적 수강생</div></div>
    <div class="kpi"><div class="val">${completedCount}</div><div class="lbl">완료 매칭</div></div>
    <div class="kpi"><div class="val">${(totalFee / 10000).toFixed(0)}만원</div><div class="lbl">강사료 집행</div></div>
  </div>

  <h2>권역별 교육 수요 현황</h2>
  <table><thead><tr><th>권역</th><th>총 수요 건수</th><th>수요 집중 월</th></tr></thead>
  <tbody>${zoneRows}</tbody></table>

  <h2>강사별 활동 실적</h2>
  <table><thead><tr><th>강사명</th><th>전문분야</th><th>강의 횟수</th><th>강사료 합계</th></tr></thead>
  <tbody>${FEE_DATA.map(r => `<tr><td>${r.name}</td><td>${r.expertise}</td><td>${r.sessions}회</td><td>${(r.sessions*r.feePerSession).toLocaleString()}원</td></tr>`).join("")}</tbody></table>

  <h2>월별 교육 실적 추이</h2>
  <table><thead><tr><th>월</th><th>강의 횟수</th><th>수강생 수</th></tr></thead>
  <tbody>${MONTHLY_STATS.map(m => `<tr><td>${m.month}</td><td>${m.sessions}회</td><td>${m.learners}명</td></tr>`).join("")}</tbody></table>

  <div class="footer">본 보고서는 화성시 AI스마트전략실 통합 관제 시스템에서 자동 생성되었습니다.</div>
  </body></html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

/* ── 수요 합계로 권역 순위 계산 ──────────────────────────── */
const ZONE_TOTALS = ZONES.map((zone, zi) => ({
  zone,
  total: DEMAND[zi].reduce((s, v) => s + v, 0),
  peak : MONTHS[DEMAND[zi].indexOf(Math.max(...DEMAND[zi]))],
  trend: DEMAND[zi][DEMAND[zi].length - 1] > DEMAND[zi][0] ? "↑" : "→",
})).sort((a, b) => b.total - a.total);

/* ── 컴포넌트 ─────────────────────────────────────────────── */
export default function AdminDashboard() {
  const [feeToast,    setFeeToast]    = useState(false);
  const [reportToast, setReportToast] = useState(false);

  const totalLearners  = MONTHLY_STATS.reduce((s, m) => s + m.learners, 0);
  const totalSessions  = MONTHLY_STATS.reduce((s, m) => s + m.sessions, 0);
  const pendingCount   = MOCK_MATCH_REQUESTS.filter((r) => r.status === "pending").length;
  const totalFee       = FEE_DATA.reduce((s, r) => s + r.sessions * r.feePerSession, 0);

  function handleFeeDownload() {
    downloadFeeCSV();
    setFeeToast(true);
    setTimeout(() => setFeeToast(false), 3000);
  }
  function handleReportDownload() {
    downloadAnnualReport();
    setReportToast(true);
    setTimeout(() => setReportToast(false), 3000);
  }

  return (
    <>
      <Head>
        <title>통합 관제 대시보드 | 화성시 AI스마트전략실</title>
      </Head>

      <DashboardLayout pageTitle="통합 관제 대시보드">

        {/* ── 페이지 헤더 ── */}
        <div className="bg-gradient-to-r from-hwaseong-blue to-blue-700 rounded-2xl px-6 py-5 text-white flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-semibold">화성시 AI스마트전략실</span>
              <span className="text-xs text-blue-200">관리자 전용</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold">통합 관제 대시보드</h1>
            <p className="text-sm text-blue-200 mt-0.5">교육 수요 히트맵 · 강사 배정 · 행정 자동화를 한 곳에서 관리하세요</p>
          </div>
          <div className="text-right text-xs text-blue-200">
            <p className="font-semibold text-white text-sm">2026년 상반기</p>
            <p>최종 업데이트: 방금 전</p>
          </div>
        </div>

        {/* ── KPI 카드 ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "총 강의 횟수",   value: `${totalSessions}회`,  icon: "📋", color: "bg-hwaseong-blue", sub: "2026 상반기" },
            { label: "누적 수강생",    value: `${totalLearners}명`,  icon: "👥", color: "bg-sky-500",       sub: "전 권역 합산" },
            { label: "대기 매칭",      value: `${pendingCount}건`,   icon: "⏳", color: "bg-amber-500",     sub: "즉시 처리 필요" },
            { label: "강사료 집행",    value: `${(totalFee/10000).toFixed(0)}만원`, icon: "💰", color: "bg-green-600", sub: "이번 달 예정" },
          ].map((c) => (
            <div key={c.label} className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-gray-100">
              <div className={`w-10 h-10 ${c.color} rounded-xl flex items-center justify-center text-lg flex-shrink-0`}>
                {c.icon}
              </div>
              <div>
                <p className="text-xs text-gray-400">{c.label}</p>
                <p className="text-2xl font-bold text-hwaseong-text">{c.value}</p>
                <p className="text-xs text-gray-400">{c.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── 히트맵 ── */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4">
            <div>
              <h2 className="font-bold text-hwaseong-text text-lg">권역별 교육 수요 히트맵</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Chart.js (<code className="bg-gray-100 px-1 rounded text-xs">chartjs-chart-matrix</code>) 기반 —
                색이 진할수록 수요가 높습니다
              </p>
            </div>
            {/* 범례 */}
            <div className="flex items-center gap-1.5 text-xs text-gray-500 flex-shrink-0">
              <span>낮음</span>
              {[0.08, 0.28, 0.48, 0.68, 0.88].map((a) => (
                <span
                  key={a}
                  className="inline-block w-5 h-5 rounded"
                  style={{ background: `rgba(0,102,204,${a})` }}
                />
              ))}
              <span>높음</span>
            </div>
          </div>

          <ZoneHeatmap />

          {/* 권역별 수요 순위 요약 */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {ZONE_TOTALS.map((z, i) => (
              <div key={z.zone} className="bg-gray-50 rounded-xl p-2.5 text-center">
                <p className="text-xs text-gray-400 mb-0.5">#{i + 1}</p>
                <p className="text-xs font-bold text-hwaseong-text leading-tight">{z.zone}</p>
                <p className="text-lg font-bold text-hwaseong-blue">{z.total}<span className="text-xs font-normal text-gray-400">건</span></p>
                <p className="text-xs text-gray-400">{z.trend} {z.peak} 최대</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 행정 자동화 ── */}
        <section className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">⚙️</span>
            <h2 className="font-bold text-white text-lg">행정 자동화</h2>
            <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full font-medium">AI 자동 생성</span>
          </div>
          <p className="text-sm text-slate-400 mb-6">반복 행정 업무를 자동으로 처리합니다. 버튼 클릭 한 번으로 완료하세요.</p>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* 강사료 증빙 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-2xl flex-shrink-0">
                  📄
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm leading-tight">이번 달 강사료<br/>증빙 자료 생성</h3>
                  <p className="text-xs text-slate-400 mt-0.5">강사별 강의 내역·금액 CSV</p>
                </div>
              </div>
              <ul className="text-xs text-slate-400 space-y-1 mb-4 pl-1">
                <li>• 강사명·전문분야·강의 횟수 포함</li>
                <li>• 회당 강사료 및 합계 자동 계산</li>
                <li>• 엑셀(CSV, UTF-8 BOM) 형식 출력</li>
              </ul>
              <button
                onClick={handleFeeDownload}
                className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all
                  bg-gradient-to-r from-blue-600 to-blue-500
                  hover:from-blue-500 hover:to-blue-400
                  active:scale-95 shadow-lg shadow-blue-900/40
                  flex items-center justify-center gap-2"
              >
                <span>⬇</span> 증빙 자료 다운로드 (CSV)
              </button>
              {feeToast && (
                <p className="text-xs text-green-400 text-center mt-2">✔ 파일이 저장되었습니다</p>
              )}
            </div>

            {/* 연간 성과 보고서 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-2xl flex-shrink-0">
                  📊
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm leading-tight">연간 성과 보고서<br/>PDF 다운로드</h3>
                  <p className="text-xs text-slate-400 mt-0.5">시장 보고용 종합 성과 문서</p>
                </div>
              </div>
              <ul className="text-xs text-slate-400 space-y-1 mb-4 pl-1">
                <li>• KPI 요약·권역별 수요·강사 실적 포함</li>
                <li>• 월별 교육 실적 추이 테이블</li>
                <li>• 브라우저 인쇄 → PDF 저장 방식</li>
              </ul>
              <button
                onClick={handleReportDownload}
                className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all
                  bg-gradient-to-r from-purple-600 to-purple-500
                  hover:from-purple-500 hover:to-purple-400
                  active:scale-95 shadow-lg shadow-purple-900/40
                  flex items-center justify-center gap-2"
              >
                <span>🖨</span> 성과 보고서 PDF 다운로드
              </button>
              {reportToast && (
                <p className="text-xs text-green-400 text-center mt-2">✔ 인쇄 창이 열렸습니다 — PDF로 저장하세요</p>
              )}
            </div>
          </div>
        </section>

        {/* ── 강사료 내역 미리보기 ── */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-hwaseong-text">이번 달 강사료 내역</h2>
              <p className="text-xs text-gray-400 mt-0.5">증빙 자료 다운로드 버튼으로 내보낼 수 있습니다</p>
            </div>
            <span className="text-sm font-bold text-hwaseong-blue">
              총 {(totalFee / 10000).toFixed(0)}만 원
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {["강사명", "전문 분야", "강의 횟수", "회당 강사료", "합계"].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 pb-2 pr-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEE_DATA.map((r) => (
                  <tr key={r.name} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2.5 pr-4 font-semibold text-hwaseong-text">{r.name}</td>
                    <td className="py-2.5 pr-4 text-gray-500 text-xs">{r.expertise}</td>
                    <td className="py-2.5 pr-4">{r.sessions}회</td>
                    <td className="py-2.5 pr-4 text-gray-500">{r.feePerSession.toLocaleString()}원</td>
                    <td className="py-2.5 font-bold text-hwaseong-blue">{(r.sessions * r.feePerSession).toLocaleString()}원</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200">
                  <td colSpan={4} className="pt-3 text-xs font-semibold text-gray-500">합계</td>
                  <td className="pt-3 font-bold text-hwaseong-blue text-base">{totalFee.toLocaleString()}원</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

      </DashboardLayout>
    </>
  );
}
