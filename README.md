# 화성人 AI 잇다(IT-DA)

**배포 URL**: https://hs-ai-leader.vercel.app/

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

### 메인페이지 (`/`)
- 히어로 슬라이드 — 배경 그라데이션 + 활동 현황 뱃지 자동 전환
- 뉴스 보드 — 공지사항·교육소식·보도자료·채용공고 탭 필터
- 활동 현황 섹션 (`ActivityStats`) — 실시간 시민리더 수·누적 강의·평균 평점
- 티커 — 주요 공지 자동 스크롤

### 시민리더 대시보드 (`/dashboard/leader`)
- 프로필 히어로 — 인증 배지, 전문 분야 태그
- 요약 통계 — 이번 달 남은 강의(프로그레스바), 누적 강의 수, 평균 평점
- 매칭 수락·거절 (거절 사유 입력 모달)
- 활동 보고서 제출 (`/dashboard/leader/report`) — 현장 사진 3장, Supabase Storage 업로드
- 보고서 재제출 기능 — 반려 사유 확인 후 수정 제출
- 내 강의 (`/dashboard/leader/lectures`) — **진행중 / 완료** 탭 분리, 완료 강의에 정산 여부 표시
- 내 일정 관리 — 지도 바로가기, 수요처 연락처, 강의 자료실
- 포트폴리오 (`/dashboard/leader/portfolio`) — 레이더 차트, 활동 이력

### 수요처 대시보드 (`/dashboard/client`)
- 강의 신청 폼 — 강의 유형(원데이형·집중코스형·장기정기형), 대상 선택, 세션 수, 일정
- 공간·장비 대여 연동 — 권역별 대여 공간/장비 선택, 이용 시간 슬롯 자동 생성
- 수요처 친화 상태 배지 — 강사 매칭 중 / 강사 수락 대기 중 / 강의 진행 확정 / 강의 완료
- 강사 안심매칭 (이름 마스킹) 및 완료 후 평점 작성

### 운영자 대시보드 (`/dashboard/admin`)
- 통합 관제 — 알림 패널(재배정 필요), 월별 차트, 요청 파이프라인
- 강의 검토 (`/admin/review`) — 승인·반려, 화성시 권역 필터, 통합 검색
- 매칭 센터 (`/admin/matching-center`) — 강사 배정 모달(검색·단일 선택), 거절 요청 재배정
- 강사 관리 (`/admin/leaders`) — 인증 승인/취소, 자격 등급(Lv.1~3), is_active 토글
- 정산 관리 (`/admin/settlement`) — 강사료 미지급/지급완료 섹션 분리, 대여료 정산
- 대여 설정 (`/admin/rental-settings`) — 공간·장비 등록·수정, 권역(구/동) 필터

---

## 매칭 알고리즘 v4.0

`lib/matching-algorithm.ts` — 캡스톤 연구 기반 가중 점수 계산

| 항목 | 가중치 |
|------|--------|
| 지역 일치 | 40 |
| 전문 분야 일치 | 40 |
| 시간 가능 여부 | 20 |

---

## 자동 거절 크론 (`/api/cron/auto-reject`)

`matched` 상태로 **24시간** 경과한 매칭 요청을 자동 거절 처리합니다.  
Vercel 배포 시 `vercel.json`에 크론 설정이 필요합니다.

```json
{
  "crons": [{ "path": "/api/cron/auto-reject", "schedule": "0 * * * *" }]
}
```

---

## 프로젝트 구조

```
pages/
  index.tsx                     랜딩 페이지 (히어로 슬라이드 · 뉴스 보드 · ActivityStats)
  login.tsx                     로그인 (역할 선택 → 폼 2단계)
  register.tsx                  회원가입 (강사: 멀티스텝 + 수료증 업로드)
  forgot-password.tsx           비밀번호 찾기
  reset-password.tsx            비밀번호 재설정
  instructors.tsx               강사 공개 목록
  auth/
    callback.tsx                OAuth / 이메일 인증 콜백
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
      lectures.tsx              내 강의 (진행중/완료 탭)
      matches.tsx               매칭 목록
      reports.tsx               보고서 목록
      report.tsx                보고서 제출
      portfolio.tsx             포트폴리오
      profile.tsx               프로필 수정
    settings.tsx                계정 설정 (비밀번호 변경·회원 탈퇴)
  api/
    auth/                       login, logout, me, register, check-email,
                                forgot-password, reset-password, update-profile,
                                upload-cert, cert-upload-url, change-password, withdraw
    leaders/                    index.ts, [id].ts
    match-requests/             index.ts, [id]/accept.ts, [id]/reject.ts
    activity-reports/           index.ts, [id]/approve.ts, [id]/reject.ts,
                                [id]/review.ts, [id]/resubmit.ts
    schedule.ts                 강사 일정 (ongoing + 연락처 + 자료실)
    upload-url.ts               Supabase Storage signed URL 발급
    upload/image.ts             이미지 업로드
    public/                     leaders.ts, rental-settings.ts
    demo/
      seed.ts                   시연용 샘플 데이터 생성/삭제 (POST/DELETE, key 인증)
    cron/
      auto-reject.ts            24시간 초과 매칭 자동 거절 (Vercel Cron)
    admin/
      stats.ts
      leaders/list.ts, [id]/verify.ts, [id]/active.ts
      match-requests/pending.ts, [id]/approve.ts, [id]/cancel.ts, [id]/assign.ts
      matching-center/leaders.ts, requests.ts
      rental-settings/index.ts, [id].ts
      settlement/reports.ts, instructor-fees.ts, [id]/instructor-fee.ts,
                rental-fees.ts, rental-fee/[id].ts, [id]/approve.ts

lib/
  auth.ts                       requireAuth 미들웨어, JWT 검증
  auth-context.tsx              React AuthContext (signIn / signOut / refresh)
  supabase-server.ts            supabaseAdmin, createAuthClient()
  supabase.ts                   클라이언트용 Supabase 인스턴스
  masking.ts                    maskLeader, scoreLeaderForRequest
  matching-algorithm.ts         캡스톤 매칭 점수 (지역40·분야40·시간20)
  rental-config.ts              대여 설정 상수

components/
  ActivityStats.tsx             메인페이지 실시간 활동 현황
  DashboardLayout.tsx           사이드바 레이아웃
  GNB.tsx                       상단 내비게이션
  Footer.tsx
  LectureCalendar.tsx           강의 일정 캘린더
  LiveCountBanner.tsx
  MatchingMap.tsx
  ZoneHeatmap.tsx
  SkillTree.tsx

supabase/migrations/            001 ~ 027 순차 적용
```

---

## 환경 설정

`.env.local` 파일을 생성하고 아래 값을 채웁니다:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=                    # Vercel Cron 인증 키 (선택, 설정 시 헤더 검증)
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

| 역할 | 이메일 |
|------|--------|
| 운영자 | admin@aitda.kr |
| 강사 (인증 완료) | leader1@aitda.kr |
| 강사 (인증 대기) | leader2@aitda.kr |
| 수요처 | client@aitda.kr |

---

## 시연용 샘플 데이터 API

개발자 콘솔에서 아래 명령으로 샘플 데이터를 생성하거나 삭제할 수 있습니다:

```js
const K = 'hwaseong-demo-2026';
// 생성
fetch(`/api/demo/seed?key=${K}`, { method: 'POST' }).then(r => r.json()).then(console.log);
// 삭제
fetch(`/api/demo/seed?key=${K}`, { method: 'DELETE' }).then(r => r.json()).then(console.log);
```

강사 5명·수요처 1명·매칭 요청 3건이 생성됩니다.

---

## Supabase Storage

다음 버킷을 Supabase Storage에서 생성합니다:

| 버킷 | 공개 여부 | 용도 |
|------|-----------|------|
| `activity-reports` | Public | 활동 보고서 현장 사진 |
| `certificates` | Private | 강사 수료증 (Signed URL 업로드) |
