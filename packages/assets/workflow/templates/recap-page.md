<!--
  /recap --confluence 가 Confluence 페이지 초안 작성 시 사용하는 템플릿.
  페이지 제목 형식: "[{issue_key}] {issue_title}"
  space_key / parent_id 는 .team-workflow/config.yml#confluence 에서 읽음.
  공개 전 사람 리뷰 필수.
-->

# [{issue_key}] {issue_title}

> Jira 링크: {jira_url}
> 담당: {assignee} · 완료일: {resolved_date}

---

## 배경

{background — Jira description 3-5줄 요약}

## 무엇이 바뀌었나

{change_narrative — 플랜 "목표" + "구현 접근" 기반 3-5문단, 사용자 관점 서술}

## 변경 파일 / 주요 지점

{changed_files_table — git diff --stat 기반, 중요 파일에 1-line 설명}

## 검증

- 정적 검증: lint / type-check / test 결과
- UI 검증: {gif_embed_or_skip}
- Goal-backward 판단: {goal_backward_note}

## 배포 후 확인 포인트

{post_deploy_checks}

## 관련 링크

- Jira: {jira_url}
- MR: {mr_url}
- 이전 논의: {related_issues_or_comments}

---

Generated via `conductor {COMMAND}` — agent {AGENT} · conductor-kit v{CLI_VERSION} · user {USER}

<!--
  섹션 추가/삭제는 자유. 팀 합의에 따라 "고객 커뮤니케이션 초안", "회고" 등 추가 가능.
-->
