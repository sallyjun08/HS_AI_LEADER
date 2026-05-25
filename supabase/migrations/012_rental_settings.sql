-- 화성人 AI 잇다(IT-DA) — 공간·장비 대여 설정 테이블 v12
-- 관리자가 대여료를 직접 수정할 수 있도록 DB에서 관리
-- fee_per_use는 임시 책정값 — 관리자 대시보드에서 언제든 수정 가능

CREATE TABLE IF NOT EXISTS public.rental_settings (
  id           text        PRIMARY KEY,
  type         text        NOT NULL CHECK (type IN ('venue', 'equipment')),
  name         text        NOT NULL,
  address      text,
  capacity     int,
  features     text[]      NOT NULL DEFAULT '{}',
  fee_per_use  int         NOT NULL DEFAULT 0,
  fee_unit     text        NOT NULL DEFAULT '회',
  max_quantity int,
  available    boolean     NOT NULL DEFAULT true,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  updated_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

COMMENT ON TABLE  public.rental_settings             IS '공간·장비 대여 설정. fee_per_use는 관리자가 대시보드에서 수정.';
COMMENT ON COLUMN public.rental_settings.fee_per_use IS '1회 대여 요금(원). 공간은 회차당, 장비는 대당·회차당.';
COMMENT ON COLUMN public.rental_settings.fee_unit    IS '요금 단위 표시용 텍스트. 예: "회", "대·회"';

-- ── 공간 시드 데이터 (임시 책정 요금) ──────────────────────────────
INSERT INTO public.rental_settings
  (id, type, name, address, capacity, features, fee_per_use, fee_unit, available)
VALUES
  ('hwaseong-city-hall-main', 'venue',
   '화성시청 대회의실',
   '경기도 화성시 남양읍 시청로 159',
   80,
   ARRAY['빔프로젝터','마이크·음향','화이트보드','냉난방'],
   50000, '회', true),

  ('dongtan-culture-a', 'venue',
   '동탄복합문화센터 교육실 A',
   '경기도 화성시 동탄면로 164',
   30,
   ARRAY['빔프로젝터','화이트보드','냉난방','무선 인터넷'],
   30000, '회', true),

  ('dongtan-culture-b', 'venue',
   '동탄복합문화센터 교육실 B',
   '경기도 화성시 동탄면로 164',
   20,
   ARRAY['빔프로젝터','화이트보드','냉난방'],
   20000, '회', true),

  ('hwaseong-library-seminar', 'venue',
   '화성시립도서관 세미나실',
   '경기도 화성시 봉담읍 와우리로 45',
   25,
   ARRAY['빔프로젝터','화이트보드','냉난방','무선 인터넷'],
   20000, '회', true),

  ('bongdam-community', 'venue',
   '봉담읍 주민자치센터 다목적실',
   '경기도 화성시 봉담읍 봉담로 11',
   40,
   ARRAY['빔프로젝터','마이크','냉난방'],
   30000, '회', true),

  ('namyang-community', 'venue',
   '남양읍 주민자치센터 강의실',
   '경기도 화성시 남양읍 남양로 310',
   25,
   ARRAY['화이트보드','냉난방'],
   20000, '회', false)   -- 리모델링 중 (임시)

ON CONFLICT (id) DO NOTHING;

-- ── 장비 시드 데이터 (임시 책정 요금) ──────────────────────────────
INSERT INTO public.rental_settings
  (id, type, name, features, fee_per_use, fee_unit, max_quantity, available)
VALUES
  ('laptop', 'equipment',
   '노트북',
   ARRAY['Windows 11','Office 365','무선 마우스 포함'],
   3000, '대·회', 30, true),

  ('tablet', 'equipment',
   '태블릿 PC',
   ARRAY['Android','터치펜 포함'],
   5000, '대·회', 20, false)   -- 추후 도입 예정

ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE public.rental_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read rental settings"
  ON public.rental_settings FOR SELECT
  USING (true);

CREATE POLICY "admin only update"
  ON public.rental_settings FOR UPDATE
  USING (public.is_admin());
