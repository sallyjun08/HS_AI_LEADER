-- ============================================================
-- 화성人 AI 잇다(IT-DA) — 스키마 개선 v3
-- 팀원 MariaDB 스키마 검토 후 반영할 아이디어 통합
-- + activity_reports 누락 컬럼 수정
-- Supabase SQL Editor 에서 전체 선택 후 Run
-- ============================================================


-- ============================================================
-- 1. activity_reports — 누락된 컬럼 추가
-- ============================================================
-- 마이그레이션 v2에서 instructor_id, lecture_date가 빠진 것 보완.
-- instructor_id: 강사 직접 참조 (match_requests.leader_id 역정규화).
--                refresh_leader_rating() 호출 시 필요.
-- lecture_date:  실제 강의 날짜 (start_date와 다를 수 있음).

alter table public.activity_reports
  add column if not exists instructor_id uuid
    references public.leader_profiles(id) on delete set null,
  add column if not exists lecture_date date;

-- 기존 데이터 backfill (기존 행이 없으면 no-op)
update public.activity_reports ar
set    instructor_id = mr.leader_id
from   public.match_requests mr
where  ar.match_id = mr.id
  and  ar.instructor_id is null;

create index if not exists idx_activity_reports_instructor_id
  on public.activity_reports(instructor_id);

create index if not exists idx_activity_reports_lecture_date
  on public.activity_reports(lecture_date);

comment on column public.activity_reports.instructor_id is
  '강사 leader_profiles.id 역정규화. match→leader_id와 동일값. refresh_leader_rating() 호출에 사용.';
comment on column public.activity_reports.lecture_date is
  '실제 강의가 진행된 날짜. match_requests.start_date(희망일)와 다를 수 있음.';


-- ============================================================
-- 2. leader_profiles — 월 최대 강의 횟수 추가
-- ============================================================
-- 팀원 스키마의 max_classes_month 아이디어 반영.
-- 강사가 한 달에 받을 수 있는 최대 매칭 수를 제한해
-- 과부하 방지 및 매칭 알고리즘에서 가용성 판단에 활용.

alter table public.leader_profiles
  add column if not exists max_classes_month int not null default 10
    check (max_classes_month > 0);

comment on column public.leader_profiles.max_classes_month is
  '월 최대 강의 가능 횟수 (기본 10회). 매칭 알고리즘에서 강사 가용성 판단에 사용.';


-- ============================================================
-- 3. match_requests — 강의 형태 / 정기 여부 추가
-- ============================================================
-- 팀원 스키마의 frequency(1회성/정기), location_type(대면/온라인/혼합) 반영.
-- 수요처가 요청 등록 시 선택 → 강사 매칭 기준으로 활용 가능.

alter table public.match_requests
  add column if not exists frequency text not null default 'single'
    check (frequency in ('single', 'regular')),
  add column if not exists location_type text not null default 'offline'
    check (location_type in ('offline', 'online', 'hybrid'));

comment on column public.match_requests.frequency is
  '강의 횟수 유형: single(1회성), regular(정기/연속). 정기인 경우 lecture_times 배열에 일정 상세 기재.';
comment on column public.match_requests.location_type is
  '강의 방식: offline(대면), online(온라인), hybrid(혼합). 강사의 이동 가능 범위와 교차 매칭에 사용.';


-- ============================================================
-- 4. match_requests — 매칭 점수 세부 항목 추가
-- ============================================================
-- 팀원 스키마의 핵심 아이디어: 매칭 근거를 항목별로 저장해
-- 관리자가 "왜 이 강사인지" 투명하게 설명 가능.
-- 관리자가 배정(assign)할 때 함께 기록.

alter table public.match_requests
  add column if not exists match_score      int not null default 0,
  add column if not exists region_score     int not null default 0,
  add column if not exists specialty_score  int not null default 0,
  add column if not exists rating_score     int not null default 0,
  add column if not exists experience_score int not null default 0;

comment on column public.match_requests.match_score is
  '종합 매칭 점수 (100점 만점). region+specialty+rating+experience 합산. 관리자 배정 시 기록.';
comment on column public.match_requests.region_score is
  '권역 점수 (0~30). 강사 활동 가능 지역과 요청 주소 일치 여부.';
comment on column public.match_requests.specialty_score is
  '전문분야 점수 (0~40). 강사 specialties와 요청 category 키워드 일치도.';
comment on column public.match_requests.rating_score is
  '평점 점수 (0~20). 강사 rating_avg 기반. (rating_avg/5)*20 으로 환산.';
comment on column public.match_requests.experience_score is
  '경험 점수 (0~10). 강사 total_lectures 기반. min(total_lectures, 10).';


-- ============================================================
-- 5. match_requests — rejected 상태 추가
-- ============================================================
-- 강사가 배정을 거절할 수 있는 플로우를 위해 status에 'rejected' 추가.
-- rejected 시 관리자가 다른 강사로 재배정 가능 → 다시 pending으로 전환.

do $$
declare
  c_name text;
begin
  select con.conname into c_name
  from   pg_constraint con
  join   pg_class rel on rel.oid = con.conrelid
  join   pg_namespace nsp on nsp.oid = rel.relnamespace
  where  nsp.nspname = 'public'
    and  rel.relname = 'match_requests'
    and  con.contype = 'c'
    and  con.conname like '%status%';

  if c_name is not null then
    execute 'alter table public.match_requests drop constraint ' || quote_ident(c_name);
  end if;
end $$;

alter table public.match_requests
  add constraint match_requests_status_check
    check (status in (
      'pending',    -- 매칭 대기 (초기값)
      'matched',    -- 강사 배정 완료
      'ongoing',    -- 강의 진행 중
      'completed',  -- 강의 완료 (보고서 제출됨)
      'cancelled',  -- 수요처/관리자 취소
      'rejected'    -- 강사가 배정 거절 → 관리자가 재배정
    ));

comment on column public.match_requests.status is
  'pending→매칭대기 | matched→강사배정 | ongoing→진행중 | completed→완료 | cancelled→취소 | rejected→강사거절(재배정필요)';


-- ============================================================
-- 6. 매칭 점수 저장 함수 업데이트
-- ============================================================
-- 관리자가 강사를 배정할 때 점수를 함께 기록하는 함수.
-- API에서 직접 UPDATE 해도 되지만 원자적 처리를 위해 RPC로 제공.

create or replace function public.assign_leader_with_score(
  p_request_id      uuid,
  p_leader_id       uuid,
  p_match_score     int default 0,
  p_region_score    int default 0,
  p_specialty_score int default 0,
  p_rating_score    int default 0,
  p_experience_score int default 0
)
returns public.match_requests
language plpgsql security definer
as $$
declare
  v_result public.match_requests;
begin
  update public.match_requests
  set    leader_id        = p_leader_id,
         status           = 'matched',
         match_score      = p_match_score,
         region_score     = p_region_score,
         specialty_score  = p_specialty_score,
         rating_score     = p_rating_score,
         experience_score = p_experience_score
  where  id = p_request_id
  returning * into v_result;

  return v_result;
end;
$$;

comment on function public.assign_leader_with_score is
  '관리자가 강사를 배정하면서 매칭 점수 세부 항목을 원자적으로 함께 저장. /api/admin/match-requests/[id]/assign에서 호출.';


-- ============================================================
-- 7. 강사 거절 함수
-- ============================================================
-- 강사가 배정을 거절하면 status를 rejected로, leader_id를 null로 초기화.
-- 관리자가 다시 pending으로 돌려 재배정할 수 있도록 별도 함수 제공.

create or replace function public.reject_match(p_request_id uuid, p_leader_id uuid)
returns public.match_requests
language plpgsql security definer
as $$
declare
  v_result public.match_requests;
begin
  update public.match_requests
  set    status    = 'rejected',
         leader_id = null
  where  id        = p_request_id
    and  leader_id = p_leader_id
    and  status    = 'matched'
  returning * into v_result;

  if v_result.id is null then
    raise exception '거절할 수 있는 매칭이 없습니다.';
  end if;

  return v_result;
end;
$$;

comment on function public.reject_match is
  '강사가 배정을 거절. status=rejected, leader_id=null 로 초기화. 관리자가 재배정 가능 상태가 됨.';


-- ============================================================
-- 8. leader_profiles_public 뷰 재생성 (max_classes_month 포함)
-- ============================================================
drop view if exists public.leader_profiles_public;

create view public.leader_profiles_public
with (security_invoker = false)
as
  select
    lp.id,
    lp.user_id,
    lp.specialties,
    lp.available_times,
    lp.available_regions,
    lp.bio,
    lp.cert_level,
    lp.is_verified,
    lp.is_active,
    lp.location,
    lp.lat,
    lp.lng,
    lp.rating_avg,
    lp.total_lectures,
    lp.response_rate,
    lp.max_classes_month,     -- 추가
    lp.created_at,
    lp.updated_at
    -- phone 제외: 안심매칭 정책
  from public.leader_profiles lp;

comment on view public.leader_profiles_public is
  '강사 공개 프로필. phone 제외. 강사 목록 조회 시 사용 (RLS 우회하는 security definer view).';
