-- 수요처 보고서 반려 기능
ALTER TABLE public.activity_reports
  ADD COLUMN IF NOT EXISTS client_rejected_at      timestamptz,
  ADD COLUMN IF NOT EXISTS client_rejection_reason text;

COMMENT ON COLUMN public.activity_reports.client_rejected_at      IS '수요처가 보고서를 반려한 시각. NULL이면 반려되지 않은 상태.';
COMMENT ON COLUMN public.activity_reports.client_rejection_reason IS '수요처가 작성한 반려 사유 (필수).';
