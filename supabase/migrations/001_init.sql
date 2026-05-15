-- ============================================================
-- 화성人 AI 잇다(IT-DA) — 초기 스키마
-- Supabase SQL Editor 또는 supabase db push 로 실행
-- ============================================================

-- profiles: auth.users 와 연결된 공개 사용자 정보
create table if not exists profiles (
  id        uuid references auth.users(id) on delete cascade primary key,
  name      text not null,
  email     text not null,
  role      text not null check (role in ('INSTRUCTOR', 'REQUESTER', 'ADMIN')),
  created_at timestamptz default now()
);

-- instructor_profiles
create table if not exists instructor_profiles (
  id             uuid default gen_random_uuid() primary key,
  user_id        uuid references profiles(id) on delete cascade unique not null,
  cert_level     int  default 1,
  cert_number    text,
  is_verified    boolean default false,
  is_active      boolean default true,
  specialties    text    default '[]',
  areas          text    default '[]',
  bio            text,
  phone          text,
  public_email   text,
  avg_rating     numeric(3,1) default 0,
  total_lectures int    default 0,
  created_at     timestamptz default now()
);

-- requester_profiles
create table if not exists requester_profiles (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references profiles(id) on delete cascade unique not null,
  org_name      text not null,
  org_type      text not null,
  contact_phone text,
  created_at    timestamptz default now()
);

-- match_requests
create table if not exists match_requests (
  id             uuid default gen_random_uuid() primary key,
  requester_id   uuid references requester_profiles(id) on delete cascade not null,
  title          text not null,
  theme          text not null,
  audience_type  text not null,
  audience_size  int  not null,
  preferred_date text not null,
  location       text not null,
  notes          text,
  status         text default 'PENDING',
  created_at     timestamptz default now()
);

-- matches
create table if not exists matches (
  id                uuid default gen_random_uuid() primary key,
  request_id        uuid references match_requests(id) on delete cascade unique not null,
  instructor_id     uuid references instructor_profiles(id) on delete cascade not null,
  instructor_agreed boolean default false,
  requester_agreed  boolean default false,
  status            text    default 'PENDING',
  revealed_at       timestamptz,
  note              text,
  created_at        timestamptz default now()
);

-- activity_reports
create table if not exists activity_reports (
  id            uuid default gen_random_uuid() primary key,
  match_id      uuid references matches(id) on delete cascade unique not null,
  instructor_id uuid references instructor_profiles(id) not null,
  lecture_date  text not null,
  attendees     int  not null,
  summary       text,
  avg_rating    numeric(3,1),
  submitted_at  timestamptz default now()
);

-- reviews
create table if not exists reviews (
  id         uuid default gen_random_uuid() primary key,
  report_id  uuid references activity_reports(id) on delete cascade not null,
  rating     int  not null check (rating >= 1 and rating <= 5),
  comment    text,
  created_at timestamptz default now()
);

-- ============================================================
-- RLS: 모든 읽기/쓰기는 서버(service role)를 통해 수행
-- ============================================================
alter table profiles          enable row level security;
alter table instructor_profiles enable row level security;
alter table requester_profiles  enable row level security;
alter table match_requests      enable row level security;
alter table matches             enable row level security;
alter table activity_reports    enable row level security;
alter table reviews             enable row level security;

-- service role 은 RLS 를 우회하므로 별도 정책 불필요
-- (모든 API 라우트는 service role 키 사용)

-- ============================================================
-- 헬퍼 함수
-- ============================================================

-- 강사 강의 횟수 증가 (atomic)
create or replace function increment_total_lectures(p_instructor_id uuid)
returns void language sql security definer as $$
  update instructor_profiles
  set total_lectures = total_lectures + 1
  where id = p_instructor_id;
$$;

-- 강사 평균 평점 갱신
create or replace function update_instructor_avg_rating(p_instructor_id uuid)
returns void language sql security definer as $$
  update instructor_profiles
  set avg_rating = (
    select round(avg(r.rating)::numeric, 1)
    from reviews r
    join activity_reports ar on ar.id = r.report_id
    where ar.instructor_id = p_instructor_id
  )
  where id = p_instructor_id;
$$;
