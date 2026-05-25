-- 화성人 AI 잇다(IT-DA) — 공간·장비 대여 필드 v11
-- match_requests에 대여 신청 여부 및 세부 정보 추가

ALTER TABLE public.match_requests
  ADD COLUMN IF NOT EXISTS needs_venue             boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rental_venue_id         text,
  ADD COLUMN IF NOT EXISTS needs_equipment         boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS rental_equipment_count  int     NOT NULL DEFAULT 0
                           CHECK (rental_equipment_count >= 0),
  ADD COLUMN IF NOT EXISTS rental_notes            text;

COMMENT ON COLUMN public.match_requests.needs_venue            IS '교육 공간 대여 신청 여부';
COMMENT ON COLUMN public.match_requests.rental_venue_id        IS 'rental-config.ts의 RENTAL_VENUES[].id. NULL이면 직접 섭외';
COMMENT ON COLUMN public.match_requests.needs_equipment        IS '장비(노트북 등) 대여 신청 여부';
COMMENT ON COLUMN public.match_requests.rental_equipment_count IS '노트북 대여 요청 수량';
COMMENT ON COLUMN public.match_requests.rental_notes           IS '대여 관련 추가 요청사항';
