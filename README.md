# 화성人 AI 잇다(IT-DA)

화성특례시 AI 시민리더 교육 매칭 플랫폼입니다.  
시민리더(강사)와 수요처(기관·학교·기업 등)를 연결하고, 운영자가 매칭·정산·대여를 통합 관리합니다.

---

## 역할 구조

| 역할 | 설명 |
|------|------|
| **시민리더** | AI 교육을 제공하는 강사. 매칭 수락/거절, 활동 보고서 제출, 포트폴리오 관리 |
| **수요처** | 교육을 신청하는 기관·학교·기업. 강의 유형 선택, 강사 안심매칭, 평점 작성 |
| **운영자** | 매칭 배정, 강사 인증, 강의 검토·승인, 정산 관리, 대여 설정 |

---

## 기술 스택

- **프레임워크**: Next.js 16.2.1 (Pages Router), React 19, TypeScript
- **백엔드·DB**: Supabase (PostgreSQL, RLS, Storage, Auth)
- **스타일**: Tailwind CSS
- **차트**: Recharts, Chart.js
- **지도**: Leaflet / react-leaflet
- **아이콘**: Lucide React

---

## 주요 기능

### 시민리더 대시보드 (`/dashboard/leader`)
- 프로필 히어로 — 인증 배지, 전문 분야 태그
- 요약 통계 — 이번 달 남은 강의(프로그레스바), 누적 강의 수, 평균 평점
- 처리 필요 항목 — 수락 대기 매칭 / 미제출 보고서 / 관리자 승인 대기 알림
- 매칭 수락·거절 (거절 사유 입력 모달)
- 활동 보고서 제출 (`/dashboard/leader/report`) — 현장 사진 3장, Supabase Storage 업로드
- 내 일정 관리 — 지도 바로가기, 수요처 연락처, 강의 자료실
- 포트폴리오 (`/dashboard/leader/portfolio`) — 히트맵, 레이더 차트, 활동 이력

### 수요처 대시보드 (`/dashboard/client`)
- 강의 신청 폼 — 강의 유형(원데이형·집중코스형·장기정기형), 대상 선택, 세션 수, 일정
- 공간·장비 대여 연동 — 권역별 대여 공간/장비 선택, 이용 시간 슬롯 자동 생성
- 수요처 친화 상태 배지 — 강사 매칭 중 / 강사 수락 대기 중 / 강의 진행 확정 / 강의 완료
- 강사 안심매칭 (이름 마스킹) 및 완료 후 평점 작성

### 운영자 대시보드 (`/dashboard/admin`)
- 통합 관제 — 알림 패널(재배정 필요·강의 요청 대기·강사 인증 대기), 월별 차트, 요청 파이프라인
- 강의 검토 (`/admin/review`) — 승인·반려, 화성시 권역 필터, 통합 검색
- 매칭 센터 (`/admin/matching-center`) — 강사 배정 모달(검색·단일 선택), 거절 요청 재배정
- 강사 관리 (`/admin/leaders`) — 인증 승인/취소, 자격 등급(Lv.1~3), is_active 토글
- 정산 관리 (`/admin/settlement`) — 강사료 미지급/지급완료 섹션 분리, 대여료 정산
- 대여 설정 (`/admin/rental-settings`) — 공간·장비 등록·수정, 권역(구/동) 필터

---

## 프로젝트 구조

```
pages/
  index.tsx                     랜딩 페이지
  login.tsx                     로그인 (역할 선택 → 폼 2단계)
  register.tsx                  회원가입 (강사: 멀티스텝 + 수료증 업로드)
  forgot-password.tsx           비밀번호 찾기
  reset-password.tsx            비밀번호 재설정
  instructors.tsx               강사 공개 목록
  admin/
    review.tsx                  교육 요청 검토·승인
    matching-center.tsx         매칭 센터 (강사 배정)
    leaders.tsx                 강사 관리
    requests.tsx                전체 요청 현황
    rental-settings.tsx         공간·장비 대여 설정
    settlement.tsx              정산 관리
  dashboard/
    admin.tsx                   운영자 대시보드
    client.tsx                  수요처 대시보드 (신청 폼 포함)
    leader.tsx                  시민리더 대시보드
    leader/
      matches.tsx               매칭 목록
      reports.tsx               보고서 목록
      report.tsx                보고서 제출
      portfolio.tsx             포트폴리오
      profile.tsx               프로필 수정
    settings.tsx                계정 설정 (비밀번호 변경·회원 탈퇴)
  api/
    auth/                       login, logout, me, register, check-email,
                                forgot-password, reset-password, update-profile,
                                upload-cert, change-password, withdraw
    leaders/                    index.ts, [id].ts
    match-requests/             index.ts, [id]/accept.ts, [id]/reject.ts
    activity-reports/           index.ts, [id]/review.ts
    schedule.ts                 강사 일정 (ongoing + 연락처 + 자료실)
    upload-url.ts               Supabase Storage signed URL 발급
    upload/image.ts             이미지 업로드
    public/                     leaders.ts, rental-settings.ts
    admin/
      stats.ts
      leaders/list.ts, [id]/verify.ts, [id]/active.ts
      match-requests/pending.ts, [id]/approve.ts, [id]/cancel.ts, [id]/assign.ts
      matching-center/leaders.ts, requests.ts
      rental-settings/index.ts, [id].ts
      settlement/reports.ts, instructor-fees.ts, [id]/instructor-fee.ts,
                rental-fees.ts, rental-fee/[id].ts, [id]/approve.ts
      seed-data.ts, create-test-client.ts

lib/
  auth.ts                       requireAuth 미들웨어, JWT 검증
  auth-context.tsx              React AuthContext (signIn / signOut / refresh)
  supabase-server.ts            supabaseAdmin, createAuthClient()
  supabase.ts                   클라이언트용 Supabase 인스턴스
  masking.ts                    maskLeader, scoreLeaderForRequest
  matching-algorithm.ts         캡스톤 매칭 점수 (지역40·분야40·시간20)
  rental-config.ts              대여 설정 상수

components/
  DashboardLayout.tsx           사이드바 레이아웃
  GNB.tsx                       상단 내비게이션
  Footer.tsx
  LiveCountBanner.tsx
  MatchingMap.tsx
  ZoneHeatmap.tsx
  SkillTree.tsx

supabase/migrations/            001 ~ 020 순차 적용
```

---

## 환경 설정

`.env.local` 파일을 생성하고 아래 값을 채웁니다 (`.env.local.example` 참고):

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## DB 마이그레이션

`supabase/migrations/` 폴더의 SQL 파일을 **001번부터 순서대로** Supabase SQL Editor에서 실행합니다.

마이그레이션 완료 후, 아래 트리거도 실행해야 회원가입 시 프로필이 자동 생성됩니다:

```sql
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, role, name)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'role', 'client'),
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  if new.raw_user_meta_data->>'role' = 'leader' then
    insert into public.leader_profiles (user_id)
    values (new.id) on conflict (user_id) do nothing;
  end if;
  return new;
end; $$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

Authentication > URL Configuration > Redirect URLs에 아래를 추가합니다:
- `http://localhost:3000/reset-password` (개발)
- 프로덕션 URL

---

## 개발 서버 실행

```bash
npm install
npm run dev
# http://localhost:3000
```

---

## 테스트 계정

| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| 운영자 | admin@aitda.kr | admin1234 |
| 강사 (인증 완료) | leader1@aitda.kr | lead1234 |
| 강사 (인증 대기) | leader2@aitda.kr | lead1234 |
| 수요처 | client@aitda.kr | client1234 |

운영자 대시보드의 **개발자 도구** 패널에서 샘플 데이터(강사 5명·수요처 1명·요청 3건) 및 테스트 수요처 계정을 생성할 수 있습니다.

---

## Supabase Storage

`activity-reports` 버킷을 Public으로 생성해야 활동 보고서 사진 업로드가 동작합니다.
