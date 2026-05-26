-- 집중코스형 보고서 다중 강의 날짜 저장
-- lecture_dates: 집중코스형처럼 여러 날짜를 한 번에 제출할 때 사용
ALTER TABLE public.activity_reports
  ADD COLUMN IF NOT EXISTS lecture_dates date[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.activity_reports.lecture_dates IS
  '집중코스형 보고서에서 선택한 강의 날짜 배열. 원데이/장기형은 빈 배열.';
