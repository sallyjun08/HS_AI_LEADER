-- ============================================================
-- 화성人 AI 잇다(IT-DA) — 정산 관리 필드 v6
-- Supabase SQL Editor 에서 전체 선택 후 Run
-- ============================================================

ALTER TABLE public.activity_reports
  ADD COLUMN IF NOT EXISTS admin_approved_at  timestamptz,
  ADD COLUMN IF NOT EXISTS admin_approved_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS admin_note         text;

COMMENT ON COLUMN public.activity_reports.admin_approved_at IS '관리자 보고서 승인 시각. NULL이면 미승인 상태.';
COMMENT ON COLUMN public.activity_reports.admin_approved_by IS '승인한 관리자 profiles.id';
COMMENT ON COLUMN public.activity_reports.admin_note        IS '관리자 검토 메모 (정산 특이사항 등)';

CREATE INDEX IF NOT EXISTS idx_activity_reports_approved
  ON public.activity_reports(admin_approved_at)
  WHERE admin_approved_at IS NOT NULL;
