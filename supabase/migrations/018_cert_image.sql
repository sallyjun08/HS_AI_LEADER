-- 강사 인증서 이미지 URL 컬럼 추가
alter table public.leader_profiles
  add column if not exists cert_image_url text default null;

comment on column public.leader_profiles.cert_image_url is 'AI 시민 리더 교육 인증서 이미지 URL. 회원가입 시 업로드.';
