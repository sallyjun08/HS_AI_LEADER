# 화성 AI 시민리더 잇다(IT-DA) — 개발 진행 현황

마지막 업데이트: 2026-05-15

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

### 대시보드
- [x] 역할별 자동 라우팅 (leader → /dashboard/leader 등)
- [x] 강사(leader) 대시보드 — 매칭 조회, 활동 보고서 제출, 프로필 수정
- [x] 수요처(client) 대시보드 — 매칭 요청 등록, 강사 안심매칭(마스킹), 평점 작성
- [x] 관리자(admin) 대시보드 — 강사 인증, 스마트 매칭(점수 배정), 통계 차트

### 메인 페이지 (랜딩)
- [x] GNB — 플랫폼명 "화성 AI 시민리더 잇다(IT-DA)", 로그인/회원가입 버튼
- [x] Hero 섹션 — #004C97 그라데이션, 연결망 SVG 애니메이션 배경
- [x] Hero — 배지(슬라이드 회전) → 슬로건 순서로 배치
- [x] Hero 슬로건 중앙 정렬 — "화성의 인재(人)를 지역 사회와 잇다, / 미래 교육의 가치를 잇다."
- [x] Hero CTA — "시민 리더로 참여하기"(`?role=leader`), "AI 교육 신청하기"(`?role=client`)
- [x] 플랫폼 소개 섹션 — 핵심 메시지(수요처·시민 리더 강조) + 통계 2개(47명/156회) + 3-card(Lucide 아이콘: 스마트 매칭·안심 프로세스·행정 자동화)
- [x] 알림마당 섹션 — 탭 필터 뉴스 보드
- [x] LiveCountBanner, Footer

### API
- [x] /api/auth/login, logout, me, register, forgot-password, reset-password
- [x] /api/auth/check-email — 이메일 중복 확인
- [x] /api/leaders (GET 목록, PUT 프로필 수정)
- [x] /api/leaders/[id] (GET 단건, 안심매칭 적용)
- [x] /api/match-requests (GET 역할별, POST 등록)
- [x] /api/activity-reports (GET 역할별, POST 제출)
- [x] /api/activity-reports/[id]/review (PATCH 평점)
- [x] /api/admin/stats
- [x] /api/admin/leaders/[id]/verify (PATCH 인증)
- [x] /api/admin/match-requests/[id]/assign (POST 배정 + 점수 저장)

### DB 스키마 (Supabase SQL Editor에서 실행 완료)
- [x] 001_init.sql
- [x] 002_full_schema.sql — profiles, leader_profiles, match_requests, activity_reports, RLS, 함수
- [x] 003_improvements.sql — activity_reports에 instructor_id/lecture_date 추가, match_requests에 frequency/location_type/점수 컬럼/rejected 상태 추가, leader_profiles에 max_classes_month 추가, assign_leader_with_score/reject_match 함수

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
- [ ] 리더 대시보드 — 배정 거절 버튼 (reject_match RPC 호출)
- [ ] 수요처 요청 폼 — frequency(1회성/정기), location_type(대면/온라인/혼합) 선택 UI 추가
- [ ] 프로덕션 배포 시 .env에 NEXT_PUBLIC_APP_URL 추가

### 선택적 개선
- [ ] 강사 프로필 페이지 (`/leaders/[id]`) — 공개 프로필 뷰
- [ ] 알림 기능 — 매칭 배정/완료 시 이메일 알림
- [ ] 관리자 대시보드 — 매칭 요청 재배정 UI (rejected 상태 처리)

---

## 주요 파일 구조

```
pages/
  index.tsx                        랜딩 페이지
  login.tsx                        로그인 (역할 선택 → 폼 2단계, 역할 불일치 차단)
  register.tsx                     회원가입 (역할 선택 → 폼, 이메일 중복확인, 비번 확인)
  forgot-password.tsx              비밀번호 찾기
  reset-password.tsx               비밀번호 재설정
  dashboard/
    leader.tsx                     강사 대시보드
    client.tsx                     수요처 대시보드
    admin.tsx                      관리자 대시보드
  api/
    auth/                          login, logout, me, register, forgot-password, reset-password, check-email
    leaders/                       index.ts, [id].ts
    match-requests/                index.ts
    activity-reports/              index.ts, [id]/review.ts
    admin/                         stats.ts, leaders/[id]/verify.ts, match-requests/[id]/assign.ts

lib/
  auth.ts                          requireAuth 미들웨어, JWT 검증
  auth-context.tsx                 React AuthContext, signIn/signOut/refresh, ROLE_REDIRECTS
  supabase-server.ts               supabaseAdmin (service role), createAuthClient()
  masking.ts                       maskLeader, scoreLeaderForRequest

components/
  GNB.tsx                          상단 내비게이션 (플랫폼명, 로그인/회원가입)
  DashboardLayout.tsx              대시보드 공통 레이아웃
  Footer.tsx                       푸터
  LiveCountBanner.tsx              실시간 통계 배너
  MatchingMap.tsx / ZoneHeatmap.tsx / SkillTree.tsx

supabase/migrations/
  001_init.sql
  002_full_schema.sql
  003_improvements.sql
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
npm run dev   # localhost:9002 (기존 서버 실행 중)
```
