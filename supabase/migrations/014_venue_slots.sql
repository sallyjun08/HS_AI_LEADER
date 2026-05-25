-- 화성人 AI 잇다(IT-DA) — 공간별 운영 요일·시간 v14

ALTER TABLE public.rental_settings
  ADD COLUMN IF NOT EXISTS available_slots jsonb;

COMMENT ON COLUMN public.rental_settings.available_slots IS
  '운영 가능 요일·시간. {"days":["mon","tue",...],"start":"09:00","end":"18:00"}. NULL이면 미설정.';

-- 기존 공간에 기본값 적용 (평일 09:00 ~ 18:00)
UPDATE public.rental_settings
SET available_slots = '{"days":["mon","tue","wed","thu","fri"],"start":"09:00","end":"18:00"}'::jsonb
WHERE type = 'venue';
