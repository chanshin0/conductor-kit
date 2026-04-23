# conductor:draft

Turn a free-form feature description into a structured Jira issue draft.

**This command does not create the Jira issue.** It writes a draft file.
The user reviews and posts via `acli jira workitem create` or the Jira UI.

## Run

```bash
conductor draft $ARGUMENTS --json --agent "Codex"
```

E.g. `conductor draft "풀 생성 모달에서 압축 블롭 크기 단위 자동 승격" --type Task`.

The CLI:

1. Runs `acli jira workitem search` with extracted keywords for duplicate
   detection.
2. Fills the `draft-issue.md` template (배경 / 목표 / 범위 / 검증 기준 / 비고).
3. Writes `.work/_drafts/{timestamp}.md`.

## Adapter responsibilities

On `{"type": "question", "id": "duplicate-check", "candidates": [...]}`:

- Present the candidate issues (key, title, status) to the user.
- Ask: "(a) 중복 아님 — 초안 계속 / (b) ACME-N 과 중복 — 초안 폐기 / (c) 참고만 하고 계속".
- Echo back the choice.

## Handoff

```json
{"status": "ok", "phase": "draft/complete",
 "data": {"draft_file": ".work/_drafts/...md", "similar": [...]},
 "handoff": {"message": "초안 검토 후 acli jira workitem create 로 등록."}}
```

Open the draft file for the user to edit. Do not auto-post.
