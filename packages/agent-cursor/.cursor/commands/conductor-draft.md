# /conductor-draft

Turn a free-form feature description into a structured Jira draft **file**.
Does not create the Jira issue.

## Run

```bash
conductor draft $ARGUMENTS --json --agent "Cursor"
```

E.g. `/conductor-draft "옵저버빌리티 숨김 알림 상세 — machers 배열 처리" --type Task`.

The CLI:

1. Searches Jira for duplicates (`acli jira workitem search`) using
   extracted keywords.
2. Renders the `draft-issue.md` template (배경 / 목표 / 범위 / 검증 기준 /
   비고).
3. Writes `.work/_drafts/{timestamp}.md`.

## Adapter responsibilities

On `{"type": "question", "id": "duplicate-check", "candidates": [...]}`:

Show candidate issues (key, title, status) and ask the user whether to
continue, merge into an existing issue, or abort.

## Handoff

```json
{"status": "ok", "phase": "draft/complete",
 "data": {"draft_file": ".work/_drafts/...md", "similar": [...]}}
```

Open the draft file for the user to edit. Do not auto-post to Jira.
