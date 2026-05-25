-- 화성人 AI 잇다(IT-DA) — 강사료·대여료 정산 필드 v19

ALTER TABLE public.activity_reports
  ADD COLUMN IF NOT EXISTS instructor_fee         int         NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS instructor_fee_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS instructor_fee_paid_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.activity_reports.instructor_fee         IS '강사료 확정 금액(원). 관리자가 직접 입력.';
COMMENT ON COLUMN public.activity_reports.instructor_fee_paid_at IS '강사료 지급 완료 시각. NULL이면 미지급.';
COMMENT ON COLUMN public.activity_reports.instructor_fee_paid_by IS '지급 처리한 관리자 profiles.id';

ALTER TABLE public.match_requests
  ADD COLUMN IF NOT EXISTS rental_fee_total   int         NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rental_fee_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS rental_fee_paid_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.match_requests.rental_fee_total   IS '대여료 확정 금액(원). 관리자가 직접 입력.';
COMMENT ON COLUMN public.match_requests.rental_fee_paid_at IS '대여료 수납 완료 시각. NULL이면 미수납.';
COMMENT ON COLUMN public.match_requests.rental_fee_paid_by IS '수납 처리한 관리자 profiles.id';
