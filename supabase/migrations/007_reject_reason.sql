-- 강사 거절 사유 저장 컬럼 추가
ALTER TABLE public.match_requests
  ADD COLUMN IF NOT EXISTS reject_reason text;

COMMENT ON COLUMN public.match_requests.reject_reason IS
  '강사가 배정을 거절할 때 입력한 사유. reject_match RPC 호출 후 API에서 별도 업데이트.';
