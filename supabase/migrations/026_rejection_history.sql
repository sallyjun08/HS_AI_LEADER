ALTER TABLE public.activity_reports
  ADD COLUMN IF NOT EXISTS rejection_history jsonb NOT NULL DEFAULT '[]';
