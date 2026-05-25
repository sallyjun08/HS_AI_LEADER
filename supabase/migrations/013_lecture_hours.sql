-- 화성人 AI 잇다(IT-DA) — 회당 강의 시간 + 대여료 단위 시간 기준 변경 v13

-- match_requests: 회당 강의 시간 추가 (기본값 2시간)
ALTER TABLE public.match_requests
  ADD COLUMN IF NOT EXISTS lecture_hours int NOT NULL DEFAULT 2
  CHECK (lecture_hours >= 1 AND lecture_hours <= 12);

COMMENT ON COLUMN public.match_requests.lecture_hours IS
  '회당 강의 시간(1~12). 대여료 = fee_per_use × lecture_hours × session_count';

-- rental_settings: fee_unit을 시간 기준으로 변경
UPDATE public.rental_settings SET fee_unit = '시간'    WHERE type = 'venue';
UPDATE public.rental_settings SET fee_unit = '대·시간' WHERE type = 'equipment';
