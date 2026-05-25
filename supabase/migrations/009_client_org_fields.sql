-- ============================================================
-- 화성人 AI 잇다(IT-DA) — 수요처 기관 정보 v9
-- profiles 테이블에 기관명·기관유형 추가
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS org_name text,
  ADD COLUMN IF NOT EXISTS org_type text;

COMMENT ON COLUMN public.profiles.org_name IS
  '수요처(client) 기관명. 예: 동탄초등학교, 화성시청, 동탄도서관';
COMMENT ON COLUMN public.profiles.org_type IS
  '수요처(client) 기관 유형. 예: 초등학교, 중학교, 고등학교, 구청/주민센터, 기업, 복지관, 도서관, 기타';
