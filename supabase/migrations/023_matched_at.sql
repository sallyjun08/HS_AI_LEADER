-- 강사 배정 시각 기록: 24시간 내 미응답 자동 거절 처리에 사용
ALTER TABLE match_requests
  ADD COLUMN IF NOT EXISTS matched_at timestamptz;
