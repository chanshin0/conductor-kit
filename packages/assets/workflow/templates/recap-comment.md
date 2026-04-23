<!--
  /recap 이 Jira 결과 보고 코멘트 작성 시 사용하는 템플릿.
  모든 플레이스홀더는 .work/{issue_key}.md 에서 자동 주입.
  3-5줄로 압축 (코멘트는 짧게 읽히는 것이 가치).
-->

**목적**: {goal_one_liner}

**변경**: {diff_summary_one_liner}

- 주요 파일: {key_files}

**검증**:

- 정적 (lint/type-check/test): {static_result}
- UI ({ui_gif_or_skip_reason}): {ui_result}
- Goal-backward 판단 근거: {goal_backward_note}

**배포 후 확인 포인트**:
{post_deploy_checks}

🔗 MR: {mr_url}

---

Generated via `conductor {COMMAND}` — agent {AGENT} · conductor-kit v{CLI_VERSION} · user {USER}
