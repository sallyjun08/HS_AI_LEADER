import { useState } from "react";

interface Node {
  id: string;
  stage: 1 | 2 | 3;
  label: string;
  sub: string;
  cert?: string;
  completed?: boolean;
  active?: boolean;
}

const NODES: Node[] = [
  { id: "n1", stage: 1, label: "생성형 AI 기초",       sub: "ChatGPT·Gemini 개념 및 실습",    completed: true },
  { id: "n2", stage: 1, label: "AI 윤리와 디지털 시민", sub: "AI 윤리·트렌드·디지털 권리",       completed: true },
  { id: "n3", stage: 2, label: "AI 시민 리더 심화",     sub: "강사 역량 육성 8주 과정",          active: true,
     cert: "KAIST 총장 명의 이수증" },
  { id: "n4", stage: 2, label: "AI 교수법 워크숍",      sub: "실전 강의 설계 및 모의 강의" },
  { id: "n5", stage: 3, label: "기업 맞춤형 강의",      sub: "업무 자동화·데이터 분석 교육",
     cert: "AI 시민 리더 자격 부여" },
  { id: "n6", stage: 3, label: "지역사회 강사 활동",    sub: "학교·기관·복지관 파견 강의" },
];

const STAGE_META = [
  { label: "STEP 1", title: "AI 기초 소양",   color: "border-sky-400   bg-sky-50",   dot: "bg-sky-400",   line: "bg-sky-300" },
  { label: "STEP 2", title: "시민 리더 양성", color: "border-hwaseong-blue bg-blue-50", dot: "bg-hwaseong-blue", line: "bg-hwaseong-blue" },
  { label: "STEP 3", title: "강사 활동",       color: "border-green-500 bg-green-50",  dot: "bg-green-500",  line: "bg-green-400" },
];

export default function SkillTree({ completedSteps = [1, 2] }: { completedSteps?: number[] }) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="w-full">
      {/* Stage headers */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {STAGE_META.map((s, i) => (
          <div key={i} className={`rounded-xl border-2 px-4 py-3 text-center ${s.color}`}>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{s.label}</p>
            <p className="font-bold text-hwaseong-text text-sm mt-0.5">{s.title}</p>
          </div>
        ))}
      </div>

      {/* Node grid */}
      <div className="grid grid-cols-3 gap-4 relative">
        {/* Horizontal connector lines */}
        <div className="absolute top-8 left-[33%] right-[33%] h-0.5 bg-gradient-to-r from-sky-300 to-hwaseong-blue z-0" />
        <div className="absolute top-8 left-[66%] right-0 h-0.5 bg-gradient-to-r from-hwaseong-blue to-green-400 z-0" />

        {[1, 2, 3].map((stage) => (
          <div key={stage} className="flex flex-col gap-3 z-10">
            {NODES.filter((n) => n.stage === stage).map((node) => {
              const isDone   = completedSteps.includes(NODES.indexOf(node) + 1);
              const isActive = node.active && !isDone;

              return (
                <div
                  key={node.id}
                  onMouseEnter={() => setHovered(node.id)}
                  onMouseLeave={() => setHovered(null)}
                  className={`relative rounded-xl border-2 p-3.5 cursor-default transition-all ${
                    isDone
                      ? "border-green-400 bg-green-50"
                      : isActive
                      ? "border-hwaseong-blue bg-blue-50 shadow-md ring-2 ring-blue-200"
                      : "border-gray-200 bg-white"
                  } ${hovered === node.id ? "shadow-lg -translate-y-0.5" : ""}`}
                >
                  <div className="flex items-start gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs mt-0.5 ${
                      isDone   ? "bg-green-500 text-white" :
                      isActive ? "bg-hwaseong-blue text-white" :
                                 "bg-gray-200 text-gray-500"
                    }`}>
                      {isDone ? "✓" : isActive ? "▶" : "○"}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold leading-snug ${isDone ? "text-green-800" : isActive ? "text-hwaseong-blue" : "text-gray-500"}`}>
                        {node.label}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 leading-snug">{node.sub}</p>
                      {node.cert && (
                        <span className="inline-block mt-1.5 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                          🏅 {node.cert}
                        </span>
                      )}
                    </div>
                  </div>
                  {isActive && (
                    <span className="absolute -top-2 -right-2 bg-hwaseong-blue text-white text-xs px-2 py-0.5 rounded-full">진행 중</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-5 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" />이수 완료</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-hwaseong-blue inline-block" />진행 중</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-200 inline-block" />미이수</span>
      </div>
    </div>
  );
}
