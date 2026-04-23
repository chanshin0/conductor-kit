---
description: 신규 Jira 이슈 초안 — 자유 프롬프트 → 5섹션 구조화 + 중복 탐지
argument-hint: "\"<desc>\" [--type Task]"
---

# /conductor:draft

**Metaphor**: sketch the score before anyone picks up an instrument.

Turn a free-form description into a structured Jira issue draft **without
creating the issue**. The user reviews, edits, then posts manually (or via
`acli jira workitem create` from the produced command line).

## Execute

```bash
conductor draft $ARGUMENTS --json --agent "Claude Code"
```

The CLI:

1. Loads `draft-issue.md` template from assets.
2. Runs `acli jira workitem search` with keyword extraction from the
   description to surface up to 5 potentially-duplicate existing issues.
3. Renders a 5-section draft (배경 / 목표 / 범위 / 검증 기준 / 비고) with
   placeholders pre-filled where deterministic.
4. Writes `.work/_drafts/{timestamp}.md`.

## Adapter responsibilities

- When the CLI emits `{"type": "question", "id": "duplicate-check", ...}`
  with a list of candidate issues, show them via `AskUserQuestion` so the
  user can confirm "not a dupe" / "dupe of ACME-N" before the draft is
  finalised.
- Offer to open the resulting draft file for the user to edit. Do **not**
  auto-post to Jira — drafts are posted manually after review.

## Handoff

```json
{"status": "ok", "phase": "draft/complete",
 "data": {"draft_file": ".work/_drafts/...md", "similar": [...]},
 "handoff": {"message": "초안 확인 후 acli jira workitem create 로 등록."}}
```
