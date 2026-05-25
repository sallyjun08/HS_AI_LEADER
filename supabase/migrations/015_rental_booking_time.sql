-- 화성人 AI 잇다(IT-DA) — 공간 대여 시작 시간 v15

ALTER TABLE public.match_requests
  ADD COLUMN IF NOT EXISTS rental_start_time time;

COMMENT ON COLUMN public.match_requests.rental_start_time IS
  '공간 대여 시작 시간. 종료 = rental_start_time + lecture_hours. 중복 예약 방지에 사용.';

-- 충돌 감지용 인덱스 (같은 공간·날짜 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_match_rental_venue_date
  ON public.match_requests(rental_venue_id, start_date)
  WHERE needs_venue = true AND rental_venue_id IS NOT NULL;
