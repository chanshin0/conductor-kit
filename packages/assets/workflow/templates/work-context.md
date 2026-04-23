# {issue_key} — {title}

> 섹션 헤딩과 순서는 sds 커맨드 간 협업 규약. 각 커맨드는 자기 섹션만 채우고 타 섹션 헤딩을 바꾸지 않는다.
> 파생 섹션(예: 브라우저 체크리스트) 추가는 허용되나 표준 헤딩 명 변경 금지.

## 메타

<!-- 각 커맨드가 실행 시 자동 갱신 -->

- 단계: Planning | Implementing | Verifying | MR-ed | MR-pending | Merged | Recapped
- 브랜치: {type}/{issue_key}-{slug}
- Jira 상태: TO DO | IN PROGRESS | RESOLVE
- 검증: lint — / type-check — / test — / ui —
- 최근 업데이트: {YYYY-MM-DD HH:MM}
- 다음 액션: conductor pick | :ship | :land | :recap

## Jira

<!-- auto: /pick Phase 1 에서 acli jira workitem view {issue_key} --json 결과 -->

- Link: {JIRA_BASE_URL}/browse/{issue_key}
- Type:
- Priority:
- Reporter:
- Assignee:
- 요약:

## 기능 개요

<!-- auto: /pick Phase 2.5 브리핑 결과. 기능 이름 / 화면 경로 / 사용자 관점 동작 / 코드 구조 / 현재 증상·변경 요청 포인트 -->

## 영향 파일 후보

<!-- auto: /pick Phase 1 Grep/Glob 결과 -->

## 플랜 (by /pick)

<!-- plan-template 구조로 채움.
     "Trivial fix — no plan needed" 한 줄만 있으면 escape hatch -->

## 실행 로그 (by /autopilot or 수동)

<!-- 플랜 단계별 진행 메모·커밋 해시·안전장치 트리거 기록 -->

## 결정 메모

<!-- 모든 단계 공용 — 그레이존 자율 결정 + 근거 기록.
     형식: {timestamp} — {상황} → {결정} (근거: CONVENTIONS §n or CLAUDE.md#anchor) -->

## 검증 결과 (by /ship)

### 정적

- lint:
- type-check:
- test:

### 브라우저

<!-- /ship Phase 1.5 결과 -->

- GIF:
- 체크리스트:
- 콘솔 에러/경고:

### Deviation / Goal-backward

<!-- /ship Phase 0/1.8 에서 감지된 편차·목표 달성 판단 근거 -->

## 머지 (by /land)

- MR URL:
- 리뷰 상태:
- 머지 SHA:
- 머지 시각:

## 회고 (by /recap)

<!-- 실행 시 채움. 템플릿 외 섹션 자의 추가 금지 -->

- Jira 결과 코멘트: (post 시각 / 코멘트 ID)
- Confluence 페이지: (--confluence 사용 시만, page ID / URL)
