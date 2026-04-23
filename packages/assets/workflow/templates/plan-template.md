# CDS-XXXX: {title}

<!-- auto: Jira summary -->

> 이 템플릿의 모든 섹션은 `/pick` 이 에이전트로 자동 채운다.
> 사람의 역할: (1) 초안 검증 (2) 수정 지시 ("{섹션}을 {이유}로 다시") (3) 에이전트가 올린 그레이존 질문에 답변.
> 빈칸 채우기 아님.

## 기능 개요

<!-- auto: /pick Phase 2.5 브리핑 결과. 기능 이름 / 화면 경로 / 사용자 관점 동작 / 코드 구조 / 현재 증상·변경 요청 포인트 -->
<!-- 플랜 검증 시 담당자가 기능 배경을 빠르게 복기하기 위한 참조용. 추정은 "추정" 으로 명시. -->

## 배경

<!-- auto: Jira description 3-5줄 요약 -->

## 목표

<!-- auto: Jira acceptance criteria 또는 description 의 목표 문장 추출. Phase 1.8 goal-backward 검증의 기준이 됨 -->

## 범위

### 포함

<!-- auto: 제목 + 영향 파일 후보에서 파생 -->

### 제외

<!-- auto: 에이전트가 추론한 명시적 제외. 인접 도메인인데 이번 범위 아님을 표기 -->

## 영향 범위 (파일 / 컴포넌트 / API) — 필수

<!-- auto: Phase 1 Grep/Glob 결과 + git log --grep "CDS-" 유사 이슈 참조 -->
<!-- /ship Phase 0 Deviation 체크의 기준. diff 가 이 목록 밖 파일을 건드리면 경고 -->
<!-- 필수: 후보가 없어도 "없음" 한 줄로 명시. 빈 섹션 금지. -->

## 구현 접근 (단계별)

<!-- auto: 영향 파일을 에이전트가 읽고 단계별 접근 제안 -->

1. ...
2. ...

## CONVENTIONS 체크

<!-- auto: .team-workflow/CONVENTIONS.md 의 비타협 규칙에 대해 이번 접근이 위반 가능한 지점 자가 점검 -->
<!-- 위반 예상 시 접근 수정 또는 명시적 예외 근거 기록. 미해소 시 구현 단계 진입 금지 -->

- [ ] 계층 의존 방향 — `View → Composable → (Query/Data/Store/Utils/Types)`, `Query → Data`
- [ ] 책임 분리 — axios 에 try/catch·가공 없음, store 에 서버 캐시 금지
- [ ] 타입 — API 타입 직접 상속 없음, `APIs.ts` 수동 수정 없음
- [ ] i18n — 사용자 노출 문구는 `useI18nToken().t(...)`
- [ ] Module Federation — `CephApp/CephRoutes/useCephProviderStore` 변경 시 host 영향 검토됨

## 테스트 전략 — 필수

<!-- 필수: 각 하위 섹션은 "없음 + 사유" 또는 "해당 없음" 으로라도 1줄 명시. 빈 섹션 금지. -->

### 정적 (pnpm scripts)

<!-- auto: 항상 lint / type-check / test. 이슈 특성상 추가할 vitest 케이스 제안 -->

- `pnpm run lint`
- `pnpm run type-check`
- `pnpm run test`

### 신규/재사용 테스트

<!-- auto: 추가할 파일 경로, 재사용할 기존 스펙. 없으면 "없음 + 사유" -->

### 브라우저 체크리스트 (/ship Phase 1.5 에서 자동 실행)

<!-- auto: 변경된 view/route 감지 후 체크리스트 생성. UI 변경 없으면 "해당 없음" -->

- [ ] {URL 경로} 접속 → {액션} → {기대 결과}
- [ ] console 에러/경고 없음

## 검증 방법

<!-- auto: 테스트 전략에서 파생. 리뷰어가 로컬에서 재현 가능한 단계 -->

## 위험 / 그레이존 — 필수

<!-- auto: 실수 시 회귀 가능성 있는 지점. 그레이존 기본 방침: CONVENTIONS 기준 보수 선택 -->
<!-- 필수: 식별된 위험이 없어도 "없음" 한 줄로 명시. 빈 섹션 금지. -->

## 보류 / 가정 사항

<!-- auto: 에이전트가 읽지 못한 외부 시스템·서버 제약 등 불확실 지점 수집. 없으면 "없음" -->

## 그레이존 답변 로그

<!-- /pick Phase 3 에서 AskUserQuestion 으로 받은 사람의 결정 기록 -->
<!-- 형식: Q: {질문} → A: {답변} (시각) -->
