-- 화성人 AI 잇다(IT-DA) — 강의 운영 형태 v17
-- lecture_type: 원데이형 / 집중코스형 / 장기정기형
-- contact_phone: 담당자 연락처
-- institution_name: 기관명 (신청 시점 스냅샷)

ALTER TABLE public.match_requests
  ADD COLUMN IF NOT EXISTS lecture_type text
    CHECK (lecture_type IN ('oneday', 'intensive', 'longterm')),
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS institution_name text;
