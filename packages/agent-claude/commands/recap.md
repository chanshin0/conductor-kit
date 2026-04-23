---
description: land 완료 후 결과 초안 — Jira 결과 코멘트 + (선택) Confluence 페이지
argument-hint: "[<ISSUE-KEY>] [--confluence]"
---

# /conductor:recap

**Metaphor**: after the set finishes, write the liner notes.

Run after `/conductor:land`. Produces a Jira "result" comment and, with
`--confluence`, a Confluence page draft.

## Execute

```bash
conductor recap $ARGUMENTS --json --agent "Claude Code"
```

The CLI collects: merged commit range, diff summary, checklist outcomes from
`.work/{KEY}.md`, MR URL, GIF path if present. It renders the
`recap-comment.md` (and `recap-page.md` if `--confluence`) template, posts to
Jira via `acli`, and — with `--confluence` and a configured endpoint —
creates a draft page.

## Adapter responsibilities

If the CLI emits a `type: "question"` for free-form summary input
(`id: "recap-summary"`), draft a 3–5 line summary from the plan's 목표 + the
diff and propose it via `AskUserQuestion`. The user may edit before it is
posted.

## Handoff

```json
{"status": "ok", "phase": "recap/complete",
 "data": {"jira_commented": true, "confluence_url": null},
 "handoff": {"message": "Recap 완료. 다음 이슈 → /conductor:pick <KEY>"}}
```

## Guardrails

- No `--confluence` unless the user asked for it explicitly. Confluence is
  team-visible; do not publish by default.
- Do not rewrite history. Recap is append-only.
