-- 1. 수요처 연락처 — profiles에 phone 컬럼 추가
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text;

COMMENT ON COLUMN public.profiles.phone IS
  '수요처(client) 담당자 연락처. 매칭 확정(ongoing) 강사에게만 노출.';

-- 2. 강의 자료실 테이블
CREATE TABLE IF NOT EXISTS public.lecture_materials (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  match_request_id  uuid        NOT NULL REFERENCES public.match_requests(id) ON DELETE CASCADE,
  uploader_id       uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title             text        NOT NULL,
  file_url          text        NOT NULL,
  file_type         text,
  file_size_kb      int,
  created_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.lecture_materials                   IS '강의 자료실. 운영자·수요처가 업로드, 강사가 다운로드.';
COMMENT ON COLUMN public.lecture_materials.file_type         IS 'pdf | pptx | docx | image | other';
COMMENT ON COLUMN public.lecture_materials.match_request_id  IS '연결된 매칭 요청. 해당 강의에만 공개.';

ALTER TABLE public.lecture_materials ENABLE ROW LEVEL SECURITY;

-- 배정된 강사, 수요처 본인, 관리자 조회
CREATE POLICY "select: matched parties or admin"
  ON public.lecture_materials FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    OR uploader_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.match_requests mr
      JOIN public.leader_profiles lp ON lp.id = mr.leader_id
      WHERE mr.id = lecture_materials.match_request_id
        AND (mr.client_id = auth.uid() OR lp.user_id = auth.uid())
    )
  );

-- 관리자·수요처만 업로드
CREATE POLICY "insert: admin or client"
  ON public.lecture_materials FOR INSERT
  WITH CHECK (
    uploader_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'client')
    )
  );

-- 업로더 본인 또는 관리자만 삭제
CREATE POLICY "delete: uploader or admin"
  ON public.lecture_materials FOR DELETE
  USING (
    uploader_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_lecture_materials_match
  ON public.lecture_materials(match_request_id);
