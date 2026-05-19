-- ============================================================
-- 화성人 AI 잇다(IT-DA) — 거절 강사 추적 v5
-- Supabase SQL Editor 에서 전체 선택 후 Run
-- ============================================================

-- ============================================================
-- 1. match_requests — 이전 거절 강사 ID 저장 컬럼 추가
-- ============================================================

ALTER TABLE public.match_requests
  ADD COLUMN IF NOT EXISTS prev_leader_id uuid
    REFERENCES public.leader_profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.match_requests.prev_leader_id IS
  '가장 최근 매칭을 거절한 강사 leader_profiles.id. 매칭 센터에서 해당 강사 제외 표시에 활용.';

CREATE INDEX IF NOT EXISTS idx_match_requests_prev_leader
  ON public.match_requests(prev_leader_id)
  WHERE prev_leader_id IS NOT NULL;


-- ============================================================
-- 2. reject_match 함수 업데이트
--    - prev_leader_id에 거절한 강사 ID 저장
--    - p_leader_id 파라미터를 선택적(DEFAULT NULL)으로 변경
--      → 기존 API 호출(p_leader_id 없는 버전) 호환 유지
-- ============================================================

CREATE OR REPLACE FUNCTION public.reject_match(
  p_request_id uuid,
  p_leader_id  uuid DEFAULT NULL
)
RETURNS public.match_requests
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_leader_id uuid;
  v_result    public.match_requests;
BEGIN
  -- 현재 배정된 강사 ID 조회
  SELECT leader_id INTO v_leader_id
  FROM   public.match_requests
  WHERE  id     = p_request_id
    AND  status = 'matched';

  IF v_leader_id IS NULL THEN
    RAISE EXCEPTION '거절할 수 있는 매칭이 없습니다.';
  END IF;

  -- p_leader_id가 전달된 경우, 본인 확인
  IF p_leader_id IS NOT NULL AND v_leader_id <> p_leader_id THEN
    RAISE EXCEPTION '본인에게 배정된 요청이 아닙니다.';
  END IF;

  UPDATE public.match_requests
  SET    status         = 'rejected',
         prev_leader_id = v_leader_id,   -- 거절한 강사 기록
         leader_id      = NULL
  WHERE  id             = p_request_id
    AND  status         = 'matched'
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.reject_match IS
  '강사 배정 거절. status=rejected, prev_leader_id=거절강사ID, leader_id=NULL. '
  'p_leader_id 생략 가능 — 현재 배정 강사를 자동으로 참조.';
