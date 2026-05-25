-- 화성人 AI 잇다(IT-DA) — 강의 시간 30분 단위 지원 v16
-- lecture_hours int → numeric(4,1) 으로 변경 (0.5 단위 저장 가능)

ALTER TABLE public.match_requests
  ALTER COLUMN lecture_hours TYPE numeric(4,1);
