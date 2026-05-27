CREATE TABLE IF NOT EXISTS public.achievements (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  achieved_at date        NOT NULL,
  title       text        NOT NULL,
  description text        NOT NULL,
  is_visible  boolean     NOT NULL DEFAULT true,
  sort_order  int         NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- 초기 데이터
INSERT INTO public.achievements (achieved_at, title, description, sort_order) VALUES
  ('2026-04-01', 'AI 시민 리더 1기 수료식',  '47명 수료 및 공식 강사 인증 완료',   1),
  ('2026-03-01', '강사 파견 서비스 확대',     '동탄·봉담 권역 추가 운영 시작',       2),
  ('2026-02-01', '누적 수강생 500명 돌파',    '서비스 개시 이래 최단 기간 달성',     3),
  ('2026-01-01', '화성 AI랩 2026 시즌 개막', '12개 과정 동시 개설 및 모집 시작',   4);
