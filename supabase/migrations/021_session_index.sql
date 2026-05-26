-- 활동 보고서 회차 인덱스 추가 (장기정기형 주차별 정산 지원)
ALTER TABLE activity_reports ADD COLUMN IF NOT EXISTS session_index INT NOT NULL DEFAULT 0;

-- 기존 match_id 단독 unique 제약 제거 (없으면 무시)
ALTER TABLE activity_reports DROP CONSTRAINT IF EXISTS activity_reports_match_id_key;

-- (match_id, session_index) 복합 unique 제약 추가
ALTER TABLE activity_reports ADD CONSTRAINT activity_reports_match_session_unique
  UNIQUE (match_id, session_index);
