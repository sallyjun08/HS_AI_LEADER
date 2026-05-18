# 화성 AI 시민리더 잇다(IT-DA) — 개발 진행 현황

마지막 업데이트: 2026-05-18

---

## 완료된 작업

### 인증
- [x] Supabase Auth 로그인 (httpOnly 쿠키 JWT)
- [x] 로그아웃
- [x] 회원가입 — 2단계 UI (역할 카드 선택 → 폼), user_metadata에 role/name 저장
- [x] 회원가입 — 이메일 중복 확인 (`/api/auth/check-email`)
- [x] 회원가입 — 비밀번호 확인 (2회 입력 + 일치 여부 실시간 표시)
- [x] 회원가입 — 비밀번호 보기/숨기기 토글
- [x] 회원가입 — URL 쿼리(`?role=leader|client`)로 역할 자동 선택 후 step 2 진입
- [x] 비밀번호 찾기 (`/forgot-password`) — 이메일로 재설정 링크 발송
- [x] 비밀번호 재설정 (`/reset-password`) — URL 해시 토큰 파싱 후 변경

### 로그인 페이지
- [x] 역할 선택 step 1 — 시민 리더 / 수요처 메인 카드 2개, 운영자 소형 바 하단 배치
- [x] 로그인 폼 step 2 — 선택 역할 배너 표시, 역할 변경 버튼
- [x] 비밀번호 보기/숨기기 토글
- [x] 역할 불일치 차단 — 선택한 역할과 DB 역할이 다르면 자동 로그아웃 + 오류 메시지

### 강사(Leader) 대시보드
- [x] 매칭 조회, 활동 보고서 제출, 프로필 수정
- [x] **배정 수락 배너** — `status = 'matched'` 요청을 탭 위 상단에 크게 노출
- [x] **수락 버튼** — `PATCH /api/match-requests/:id/accept` 호출 → status `'ongoing'`
- [x] **거절 버튼** — `POST /api/match-requests/:id/reject` 호출 → `reject_match` RPC (status `'rejected'`, leader_id 초기화)
- [x] 매칭 요청 탭 카드에도 수락/거절 버튼 중복 표시
- [x] 상태 변경 후 목록 실시간 갱신

### 수요처(Client) 대시보드
- [x] 매칭 요청 등록, 강사 안심매칭(마스킹), 평점 작성
- [x] **상태 배지 개편** — 수요처 친화 표현으로 변경
  - `pending` → 🔍 강사 매칭 중 (황색)
  - `matched` → ⏳ 강사 수락 대기 중 (하늘색)
  - `ongoing` → ✅ 강의 진행 확정 (초록)
  - `rejected` → 🔄 강사 재매칭 중 (남색, 부정 뉘앙스 차단)
  - `completed` → 🎓 강의 완료 (회색)
- [x] 각 배지에 아이콘 + `ring-1` 외곽선 추가

### 운영자(Admin) 대시보드 (`/dashboard/admin`)
- [x] 강사 인증 관리, 통계 차트
- [x] **매칭 관리 탭** — pending 요청 리스트 + 강사 배정하기 버튼
- [x] **거절된 요청 관리 섹션** — rejected 요청 별도 표시, 재배정 버튼
- [x] **실시간 교육 매칭 현황 섹션** (stats 탭 상단)
  - 집계 카드 3개: 신규 요청(pending) / 수락 대기(matched) / 재배정 필요(rejected)
  - 필터 탭: 대기 / 배정중 / 거절됨
  - 요청 행: 교육명, 요청 기관, 희망 지역, 교육 일시, 상태 배지
  - rejected 행: 빨간 좌측 테두리 강조
  - 새로고침 버튼 (fetchAll 재호출)
- [x] **강사 배정 워크플로우 모달** 개선
  - 이름·전문 분야 실시간 검색창
  - `is_verified && is_active` 강사만 표시
  - 카드 클릭 → 단일 선택 (파란 테두리 + ✓), 재클릭 해제
  - 하단 선택 요약 + **[최종 배정]** 버튼 (미선택 시 비활성)
  - 배정 성공 시 liveTab → "matched" 자동 이동
  - 성공/실패 **Toast 알림** (3.5초 자동 소멸, fade-up 애니메이션)

### 강사 관리 전용 페이지 (`/admin/leaders`)
- [x] 인증 대기 / 인증 완료 탭 (카운트 배지)
- [x] 이름·이메일 실시간 검색
- [x] 강사 카드: 이름, 이메일, 전문 분야 배지, 가입일, 강의 수, 평점, 인증 상태
- [x] **상세 모달**
  - 자격증 이미지 미리보기 (없으면 placeholder + 자격증 번호)
  - 자격 등급 변경 (Lv.1 기초 / Lv.2 리더 / Lv.3 전문 버튼 선택)
  - [인증 승인] / [인증 취소] 버튼 → `PATCH /api/admin/leaders/:id/verify`
  - is_active 토글 → `PATCH /api/admin/leaders/:id/active` (매칭 후보 제외/포함)
  - 모든 액션 후 성공 메시지 + 목록 자동 갱신

### 공통 컴포넌트 — 사이드바 (`DashboardLayout.tsx`)
- [x] `<a>` 태그 → Next.js `<Link>` 교체 (클라이언트 라우팅)
- [x] active 하이라이트 버그 수정 — hash 포함 동일 pathname 항목이 모두 활성화되던 문제 해결
  - hash 있는 링크: `router.asPath` 전체 비교
  - hash 없는 링크: `router.pathname` 비교
- [x] 관리자 사이드바 "강사 관리" → `/admin/leaders` 연결

### API
- [x] /api/auth/login, logout, me, register, forgot-password, reset-password, check-email
- [x] /api/leaders (GET 목록, PUT 프로필 수정)
- [x] /api/leaders/[id] (GET 단건, 안심매칭 적용)
- [x] /api/match-requests (GET 역할별, POST 등록)
- [x] /api/match-requests/[id]/accept (PATCH — 강사 수락, status → 'ongoing')
- [x] /api/match-requests/[id]/reject (POST — 강사 거절, reject_match RPC)
- [x] /api/activity-reports (GET 역할별, POST 제출)
- [x] /api/activity-reports/[id]/review (PATCH 평점)
- [x] /api/admin/stats
- [x] /api/admin/leaders/list (GET — 전체 강사, profiles 조인, is_active 무관)
- [x] /api/admin/leaders/[id]/verify (PATCH 인증 + 등급)
- [x] /api/admin/leaders/[id]/active (PATCH is_active 토글)
- [x] /api/admin/match-requests/[id]/assign (POST 배정 + assign_leader_with_score RPC)

### DB 스키마 (Supabase SQL Editor에서 실행 완료)
- [x] 001_init.sql
- [x] 002_full_schema.sql — profiles, leader_profiles, match_requests, activity_reports, RLS, 함수
- [x] 003_improvements.sql — assign_leader_with_score / reject_match 함수, 점수 컬럼, rejected 상태

---

## 남은 작업

### Supabase 설정 (대시보드에서 직접)
- [ ] `handle_new_user` 트리거 SQL 실행
  - 회원가입 시 auth.users INSERT → profiles 자동 생성
  - 아래 SQL을 SQL Editor에서 실행:
    ```sql
    create or replace function public.handle_new_user()
    returns trigger language plpgsql security definer as $$
    begin
      insert into public.profiles (id, email, role, name)
      values (new.id, new.email,
        coalesce(new.raw_user_meta_data->>'role', 'client'),
        coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
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
- [ ] Authentication > URL Configuration > Redirect URLs에 추가:
  - `http://localhost:3000/reset-password` (개발)
  - 프로덕션 URL도 추가 필요

### 코드
- [ ] 수요처 요청 폼 — frequency(1회성/정기), location_type(대면/온라인/혼합) 선택 UI
- [ ] 강사 자격증 이미지 업로드 기능 (Supabase Storage 연동)
- [ ] 프로덕션 배포 시 .env에 NEXT_PUBLIC_APP_URL 추가

### 선택적 개선
- [ ] 강사 공개 프로필 페이지 (`/leaders/[id]`)
- [ ] 알림 기능 — 매칭 배정/완료 시 이메일 알림
- [ ] 운영자 대시보드 — 매칭 점수 알고리즘 적용 (현재 전부 0점)

---

## 주요 파일 구조

```
pages/
  index.tsx                        랜딩 페이지
  login.tsx                        로그인 (역할 선택 → 폼 2단계)
  register.tsx                     회원가입
  forgot-password.tsx              비밀번호 찾기
  reset-password.tsx               비밀번호 재설정
  admin/
    leaders.tsx                    강사 관리 전용 페이지 (/admin/leaders)
  dashboard/
    leader.tsx                     강사 대시보드 (수락/거절 UI 포함)
    client.tsx                     수요처 대시보드 (상태 배지 개편)
    admin.tsx                      운영자 대시보드 (실시간 현황 + 배정 워크플로우)
  api/
    auth/                          login, logout, me, register, forgot-password, reset-password, check-email
    leaders/                       index.ts, [id].ts
    match-requests/                index.ts, [id]/accept.ts, [id]/reject.ts
    activity-reports/              index.ts, [id]/review.ts
    admin/
      stats.ts
      leaders/
        list.ts                    전체 강사 목록 (profiles 조인)
        [id]/
          verify.ts                인증 + 등급 변경
          active.ts                is_active 토글
      match-requests/
        [id]/assign.ts             강사 배정 (assign_leader_with_score RPC)

lib/
  auth.ts                          requireAuth 미들웨어, JWT 검증
  auth-context.tsx                 React AuthContext, signIn/signOut
  supabase-server.ts               supabaseAdmin, createAuthClient()
  masking.ts                       maskLeader, scoreLeaderForRequest

components/
  GNB.tsx
  DashboardLayout.tsx              사이드바 (Link 교체, active 버그 수정)
  Footer.tsx
  LiveCountBanner.tsx
  MatchingMap.tsx / ZoneHeatmap.tsx / SkillTree.tsx
```

---

## 테스트 계정

| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| 관리자 | admin@aitda.kr | admin1234 |
| 강사(인증) | leader1@aitda.kr | lead1234 |
| 강사(미인증) | leader2@aitda.kr | lead1234 |
| 수요처 | client@aitda.kr | client1234 |

## 개발 서버
```bash
npm run dev   # localhost:9002
```

## 최근 커밋
```
f101957  feat: 운영자·강사·수요처 대시보드 매칭 워크플로우 전면 구현
20bc809  feat: 화성 AI 시민리더 잇다(IT-DA) 플랫폼 전면 구축
```
