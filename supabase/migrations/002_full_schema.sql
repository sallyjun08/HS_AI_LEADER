-- ============================================================
-- 화성人 AI 잇다(IT-DA) — 완전한 Supabase 스키마 v2
-- Supabase SQL Editor 에서 전체 선택 후 Run
-- ※ 기존 테이블을 삭제 후 재생성합니다
-- ============================================================


-- ============================================================
-- 0. 기존 정리 (재실행 시 충돌 방지)
-- ============================================================
drop view  if exists public.leader_profiles_public cascade;
drop table if exists public.activity_reports  cascade;
drop table if exists public.match_requests    cascade;
drop table if exists public.leader_profiles   cascade;
drop table if exists public.profiles          cascade;
drop function if exists public.is_admin()                        cascade;
drop function if exists public.set_updated_at()                  cascade;
drop function if exists public.refresh_leader_rating(uuid)       cascade;
drop function if exists public.increment_lecture_count(uuid)     cascade;
drop function if exists public.find_leaders_within_km(numeric, numeric, numeric) cascade;


-- ============================================================
-- 1. 확장 기능
-- ============================================================

-- PostGIS: 위도/경도 기반 거리 계산에 필요
-- Supabase 에서 기본 제공 (무료 티어 포함)
create extension if not exists postgis;


-- ============================================================
-- 2. 헬퍼 함수 (RLS 정책에서 반복 사용)
-- ============================================================

-- updated_at 자동 갱신용 공통 트리거 함수 (테이블 참조 없음 — 먼저 생성)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- is_admin() 은 profiles 테이블 생성 후 아래에서 정의


-- ============================================================
-- 3. 테이블 생성
-- ============================================================

-- ----------------------------------------------------------
-- 3-1. profiles — 플랫폼 사용자 기본 정보
-- ----------------------------------------------------------
create table public.profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  email       text        not null,
  role        text        not null default 'client'
                          check (role in ('leader', 'client', 'admin')),
  name        text        not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table  public.profiles            is '플랫폼 사용자 기본 정보. Supabase Auth(auth.users)와 1:1 연결.';
comment on column public.profiles.id         is 'Supabase Auth 사용자 UUID. auth.users.id 와 동일 값.';
comment on column public.profiles.role       is '역할 구분: leader=AI강사, client=교육수요처, admin=운영자';
comment on column public.profiles.email      is '로그인 이메일 (auth.users.email 복사본, 빠른 조회용)';

-- profiles 생성 후 is_admin() 정의 (테이블 참조 유효)
create or replace function public.is_admin()
returns boolean
language sql stable security definer
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

comment on function public.is_admin() is '현재 로그인한 사용자가 관리자인지 확인. RLS 정책에서 재사용.';

-- ----------------------------------------------------------
-- 3-2. leader_profiles — 강사 상세 프로필
-- ----------------------------------------------------------
create table public.leader_profiles (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null unique references public.profiles(id) on delete cascade,

  -- 강의 역량
  specialties       text[]      not null default '{}',
  available_times   jsonb       not null default '{}',
  available_regions text[]      not null default '{}',
  bio               text,
  cert_level        int         not null default 1 check (cert_level between 1 and 3),
  is_verified       boolean     not null default false,
  is_active         boolean     not null default true,

  -- 위치 데이터 (PostGIS)
  location          geography(Point, 4326),   -- 거리 계산용 지리 좌표
  lat               numeric(10, 7),            -- 위도 (지도 표시용 백업)
  lng               numeric(10, 7),            -- 경도 (지도 표시용 백업)

  -- 알고리즘 예비 필드 (매칭 점수 산정에 활용)
  rating_avg        numeric(3, 1)  not null default 0   check (rating_avg between 0 and 5),
  total_lectures    int            not null default 0   check (total_lectures >= 0),
  response_rate     numeric(4, 3)  not null default 1.0 check (response_rate between 0 and 1),

  -- 개인정보 보호 대상 (RLS 정책으로 접근 제어)
  phone             text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table  public.leader_profiles                is 'AI 강사 상세 프로필. phone 컬럼은 매칭 확정 후에만 수요처에 공개(안심매칭).';
comment on column public.leader_profiles.user_id        is 'profiles.id 참조. 강사 1명당 1개 행.';
comment on column public.leader_profiles.specialties    is '전문 분야 배열. 예: ["생성형AI","ChatGPT","데이터분석"]';
comment on column public.leader_profiles.available_times is '가능 시간대 JSON. 예: {"weekdays":["mon","wed"],"time_slots":["14:00-17:00"],"exclude_dates":["2024-12-25"]}';
comment on column public.leader_profiles.available_regions is '활동 가능 지역 배열. 예: ["화성시","수원시","오산시"]';
comment on column public.leader_profiles.cert_level     is '자격 등급: 1=AI기초수료, 2=시민리더자격, 3=전문강사';
comment on column public.leader_profiles.location       is 'PostGIS geography 좌표(경도,위도). st_dwithin()으로 반경 내 강사 검색에 사용.';
comment on column public.leader_profiles.lat            is '위도(latitude). 지도 렌더링 및 앱 내 표시용. location 컬럼과 동기화 권장.';
comment on column public.leader_profiles.lng            is '경도(longitude). 지도 렌더링 및 앱 내 표시용. location 컬럼과 동기화 권장.';
comment on column public.leader_profiles.rating_avg     is '수요처 평점 평균(0.0~5.0). 매칭 알고리즘 평판 점수로 활용. refresh_leader_rating()로 갱신.';
comment on column public.leader_profiles.total_lectures is '누적 강의 횟수. 경험치 기반 매칭 가중치. increment_lecture_count()로 증가.';
comment on column public.leader_profiles.response_rate  is '요청 응답률(0~1). 1.0=100% 응답. 강사 신뢰도 알고리즘 반영용 예비 필드.';
comment on column public.leader_profiles.phone          is '강사 연락처. 안심매칭 정책: match_requests.status가 matched/ongoing일 때만 해당 수요처에 공개.';

-- ----------------------------------------------------------
-- 3-3. match_requests — 강의 매칭 요청
-- ----------------------------------------------------------
create table public.match_requests (
  id                uuid        primary key default gen_random_uuid(),
  client_id         uuid        not null references public.profiles(id) on delete cascade,
  leader_id         uuid        references public.leader_profiles(id),  -- 매칭 전 NULL

  -- 요청 상세
  title             text        not null,
  category          text        not null,
  target_age        text,
  participant_count int         not null check (participant_count > 0),
  institution_type  text,
  notes             text,

  -- 일정 / 장소
  location          geography(Point, 4326),
  lat               numeric(10, 7),
  lng               numeric(10, 7),
  address           text,
  start_date        date        not null,
  end_date          date,
  lecture_times     jsonb       not null default '[]',

  -- 상태 관리
  status            text        not null default 'pending'
                                check (status in ('pending','matched','ongoing','completed','cancelled')),

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table  public.match_requests                   is '수요처가 등록하는 강의 매칭 요청. 관리자가 leader_id를 배정하면 matched 상태로 전환.';
comment on column public.match_requests.client_id         is '요청 등록 수요처 (profiles.id)';
comment on column public.match_requests.leader_id         is '배정된 강사 프로필 ID. 운영자 배정 전 NULL.';
comment on column public.match_requests.category          is '강의 분야. 예: "생성형AI", "AI윤리", "코딩교육", "디지털리터러시"';
comment on column public.match_requests.target_age        is '교육 대상. 예: "초등학생", "중·고등학생", "성인", "시니어(60+)"';
comment on column public.match_requests.institution_type  is '기관 유형. 예: "초등학교", "기업", "주민센터", "복지관", "도서관"';
comment on column public.match_requests.location          is 'PostGIS 좌표. 강사와 수요처 간 거리 계산에 활용.';
comment on column public.match_requests.lecture_times     is '강의 일정 JSON 배열. 예: [{"date":"2024-03-15","start":"10:00","end":"12:00"},{"date":"2024-03-22","start":"10:00","end":"12:00"}]';
comment on column public.match_requests.status            is '상태 흐름: pending(접수) → matched(강사배정) → ongoing(진행중) → completed(완료) / cancelled(취소)';

-- ----------------------------------------------------------
-- 3-4. activity_reports — 강의 활동 보고서
-- ----------------------------------------------------------
create table public.activity_reports (
  id                 uuid        primary key default gen_random_uuid(),
  match_id           uuid        not null unique references public.match_requests(id) on delete cascade,

  attendance_count   int         not null check (attendance_count >= 0),
  image_urls         text[]      not null default '{}',
  report_text        text,
  rating_from_client numeric(2,1)
                                 check (rating_from_client between 1 and 5),

  submitted_at  timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table  public.activity_reports                       is '강의 완료 후 강사가 제출하는 활동 보고서. 수요처가 rating_from_client 평점을 부여.';
comment on column public.activity_reports.match_id             is '완료된 매칭 ID. 매칭 1건 당 보고서 1개(unique).';
comment on column public.activity_reports.attendance_count     is '실제 참석 인원 수';
comment on column public.activity_reports.image_urls           is '강의 현장 사진 URL 배열. Supabase Storage 경로 사용 권장.';
comment on column public.activity_reports.report_text          is '강사가 작성하는 강의 결과 및 특이사항 요약';
comment on column public.activity_reports.rating_from_client   is '수요처 만족도 평점(1.0~5.0). 제출 시 refresh_leader_rating() 호출로 강사 평균 평점 자동 갱신.';


-- ============================================================
-- 4. 인덱스 (쿼리 성능 최적화)
-- ============================================================

-- 지리 공간 인덱스 (반경 검색에 필수)
create index idx_leader_location      on public.leader_profiles using gist(location);
create index idx_match_req_location   on public.match_requests  using gist(location);

-- 자주 필터링되는 컬럼
create index idx_leader_verified      on public.leader_profiles(is_verified) where is_active = true;
create index idx_leader_rating        on public.leader_profiles(rating_avg desc) where is_active = true;
create index idx_match_status         on public.match_requests(status);
create index idx_match_client         on public.match_requests(client_id);
create index idx_match_leader         on public.match_requests(leader_id) where leader_id is not null;
create index idx_report_match         on public.activity_reports(match_id);


-- ============================================================
-- 5. updated_at 자동 갱신 트리거
-- ============================================================
create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger trg_leader_profiles_updated
  before update on public.leader_profiles
  for each row execute function public.set_updated_at();

create trigger trg_match_requests_updated
  before update on public.match_requests
  for each row execute function public.set_updated_at();

create trigger trg_activity_reports_updated
  before update on public.activity_reports
  for each row execute function public.set_updated_at();


-- ============================================================
-- 6. 공개 뷰 — 전화번호 제외 강사 목록 (안심매칭)
-- ============================================================
-- 매칭 전 강사 탐색용. phone 컬럼을 의도적으로 제외.
-- security_definer 뷰이므로 leader_profiles 의 RLS 를 우회하지만
-- phone 이 없으므로 개인정보 노출 없음.
create or replace view public.leader_profiles_public as
select
  id, user_id,
  specialties, available_times, available_regions,
  bio, cert_level, is_verified, is_active,
  location, lat, lng,
  rating_avg, total_lectures, response_rate,
  created_at, updated_at
from public.leader_profiles
where is_active = true;

comment on view public.leader_profiles_public is
  '강사 공개 프로필 뷰 (phone 제외). 매칭 전 목록 탐색에 사용. '
  '매칭 확정 후 phone 조회는 leader_profiles 테이블 직접 접근 (RLS 적용).';

-- 인증된 사용자에게 뷰 읽기 권한 부여
grant select on public.leader_profiles_public to authenticated;


-- ============================================================
-- 7. RLS 활성화
-- ============================================================
alter table public.profiles          enable row level security;
alter table public.leader_profiles   enable row level security;
alter table public.match_requests    enable row level security;
alter table public.activity_reports  enable row level security;


-- ============================================================
-- 8. RLS 정책 — profiles
-- ============================================================

-- 관리자: 모든 작업 허용
create policy "admin: full access"
  on public.profiles for all
  using (public.is_admin());

-- 인증 사용자: 모든 프로필 조회 (공개 정보)
create policy "authenticated: read all profiles"
  on public.profiles for select
  using (auth.role() = 'authenticated');

-- 본인 프로필만 수정 가능
create policy "user: update own profile only"
  on public.profiles for update
  using (id = auth.uid());


-- ============================================================
-- 9. RLS 정책 — leader_profiles (핵심: 안심매칭)
-- ============================================================

-- 관리자: 전체 접근 (phone 포함)
create policy "admin: full access"
  on public.leader_profiles for all
  using (public.is_admin());

-- 강사 본인: 전체 접근 (phone 포함)
create policy "leader: full access to own profile"
  on public.leader_profiles for all
  using (user_id = auth.uid());

-- ▶ 안심매칭 핵심 정책
--   매칭 확정(matched) 또는 진행중(ongoing) 상태일 때만
--   해당 수요처가 강사의 phone 번호 포함 프로필을 조회할 수 있음
create policy "client: view leader phone only when matched"
  on public.leader_profiles for select
  using (
    exists (
      select 1
      from public.match_requests mr
      where mr.leader_id  = leader_profiles.id
        and mr.client_id  = auth.uid()
        and mr.status     in ('matched', 'ongoing')
    )
  );


-- ============================================================
-- 10. RLS 정책 — match_requests
-- ============================================================

-- 관리자: 전체 접근
create policy "admin: full access"
  on public.match_requests for all
  using (public.is_admin());

-- 수요처: 본인 요청 관리 (등록·조회·취소)
create policy "client: manage own requests"
  on public.match_requests for all
  using (client_id = auth.uid());

-- 배정된 강사: 본인 매칭 요청 조회
create policy "leader: view matched requests"
  on public.match_requests for select
  using (
    leader_id is not null and
    exists (
      select 1 from public.leader_profiles
      where id = match_requests.leader_id
        and user_id = auth.uid()
    )
  );


-- ============================================================
-- 11. RLS 정책 — activity_reports
-- ============================================================

-- 관리자: 전체 접근
create policy "admin: full access"
  on public.activity_reports for all
  using (public.is_admin());

-- 강사: 본인 매칭 보고서 등록·조회
create policy "leader: manage own reports"
  on public.activity_reports for all
  using (
    exists (
      select 1
      from public.match_requests mr
      join public.leader_profiles lp on lp.id = mr.leader_id
      where mr.id        = activity_reports.match_id
        and lp.user_id   = auth.uid()
    )
  );

-- 수요처: 본인 매칭 보고서 조회
create policy "client: view reports for own requests"
  on public.activity_reports for select
  using (
    exists (
      select 1 from public.match_requests
      where id = activity_reports.match_id
        and client_id = auth.uid()
    )
  );

-- 수요처: 평점 등록 (rating_from_client 수정)
create policy "client: submit rating"
  on public.activity_reports for update
  using (
    exists (
      select 1 from public.match_requests
      where id = activity_reports.match_id
        and client_id = auth.uid()
        and status = 'completed'   -- 완료된 매칭만 평점 가능
    )
  );


-- ============================================================
-- 12. 알고리즘용 헬퍼 함수
-- ============================================================

-- 강사 평점 평균 갱신 (보고서 평점 제출 후 호출)
create or replace function public.refresh_leader_rating(p_leader_id uuid)
returns void language sql security definer as $$
  update public.leader_profiles
  set rating_avg = (
    select coalesce(round(avg(ar.rating_from_client)::numeric, 1), 0)
    from public.activity_reports ar
    join public.match_requests   mr on mr.id = ar.match_id
    where mr.leader_id              = p_leader_id
      and ar.rating_from_client is not null
  )
  where id = p_leader_id;
$$;

comment on function public.refresh_leader_rating is
  '수요처가 평점 제출 시 호출. leader_profiles.rating_avg 를 모든 보고서 평균으로 갱신.';


-- 강의 횟수 증가 (매칭 completed 처리 시 호출)
create or replace function public.increment_lecture_count(p_leader_id uuid)
returns void language sql security definer as $$
  update public.leader_profiles
  set total_lectures = total_lectures + 1
  where id = p_leader_id;
$$;

comment on function public.increment_lecture_count is
  '강의 완료(completed) 처리 시 호출. leader_profiles.total_lectures 원자적 증가.';


-- 거리 기반 근처 강사 검색 (매칭 알고리즘 1단계: 지역 필터)
create or replace function public.find_leaders_within_km(
  p_lat  numeric,
  p_lng  numeric,
  p_km   numeric default 30
)
returns table (
  leader_profile_id  uuid,
  distance_km        numeric
)
language sql stable security definer as $$
  select
    lp.id as leader_profile_id,
    round(
      (st_distance(
        lp.location,
        st_makepoint(p_lng, p_lat)::geography
      ) / 1000)::numeric, 1
    ) as distance_km
  from public.leader_profiles lp
  where lp.is_active   = true
    and lp.is_verified = true
    and lp.location is not null
    and st_dwithin(
      lp.location,
      st_makepoint(p_lng, p_lat)::geography,
      p_km * 1000  -- km → m 변환
    )
  order by distance_km;
$$;

comment on function public.find_leaders_within_km is
  '수요처 위치(위도/경도) 기준 p_km km 이내 인증 강사 목록을 거리순으로 반환. '
  '매칭 추천 알고리즘 지역 필터 1단계로 활용. '
  '사용 예: select * from find_leaders_within_km(37.199, 126.831, 20);';
