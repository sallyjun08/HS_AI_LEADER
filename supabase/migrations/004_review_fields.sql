-- ============================================================
-- 화성人 AI 잇다(IT-DA) — 교육 요청 검토 기능 v4
-- Supabase SQL Editor 에서 전체 선택 후 Run
-- ============================================================

-- ============================================================
-- 1. match_requests — 검토 관련 컬럼 추가
-- ============================================================

ALTER TABLE public.match_requests
  ADD COLUMN IF NOT EXISTS is_approved   boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS reviewed_at   timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.match_requests.is_approved IS
  '운영자 검토 승인 여부. false=검토 대기(기본), true=승인 완료 → 매칭 관리로 이관.';
COMMENT ON COLUMN public.match_requests.cancel_reason IS
  '반려/취소 사유. 운영자가 status=cancelled 처리 시 입력.';
COMMENT ON COLUMN public.match_requests.reviewed_at IS
  '운영자 검토(승인 또는 반려) 처리 시각.';
COMMENT ON COLUMN public.match_requests.reviewed_by IS
  '검토한 운영자 profiles.id. 감사 추적용.';


-- ============================================================
-- 2. 기존 데이터 backfill
-- 마이그레이션 이전에 등록된 요청들은 이미 매칭 탭에서
-- 관리되고 있으므로 모두 승인된 것으로 처리
-- ============================================================

UPDATE public.match_requests
SET is_approved = true
WHERE status IN ('pending', 'matched', 'ongoing', 'completed', 'rejected');

-- cancelled는 is_approved=false 유지해도 무방 (status로 이미 필터됨)


-- ============================================================
-- 3. 인덱스 추가
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_match_requests_is_approved
  ON public.match_requests(is_approved)
  WHERE status = 'pending';
