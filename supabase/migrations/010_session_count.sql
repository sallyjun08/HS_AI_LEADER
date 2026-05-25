-- 화성人 AI 잇다(IT-DA) — 강의 회차 수 v10
-- match_requests에 강의 회차 수 추가. 강사비 = session_count × 30,000원

ALTER TABLE public.match_requests
  ADD COLUMN IF NOT EXISTS session_count int NOT NULL DEFAULT 1
  CHECK (session_count >= 1);

COMMENT ON COLUMN public.match_requests.session_count IS
  '강의 회차 수(1 이상). 예상 강사비 = session_count × 30,000원';
