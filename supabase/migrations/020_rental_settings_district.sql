ALTER TABLE public.rental_settings
  ADD COLUMN IF NOT EXISTS district text;

-- 기존 공간 데이터에 지역(district) 설정
UPDATE public.rental_settings SET district = '동탄'
  WHERE id IN ('dongtan-culture-a', 'dongtan-culture-b');

UPDATE public.rental_settings SET district = '봉담'
  WHERE id IN ('hwaseong-library-seminar', 'bongdam-community');

UPDATE public.rental_settings SET district = '남양'
  WHERE id IN ('hwaseong-city-hall-main', 'namyang-community');
