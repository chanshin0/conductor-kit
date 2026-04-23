---
description: 피드백을 워크플로우(커맨드·템플릿·설정)에 구조화해 반영
argument-hint: "\"<feedback>\"  |  review"
---

# /conductor:tune

**Metaphor**: tune the instruments between sets.

Classify workflow feedback, propose targeted edits, and (after approval)
apply them. Two modes:

- `/conductor:tune "<feedback>"` — classify a single feedback item.
- `/conductor:tune review` — walk unprocessed entries in
  `.conductor/tune-log.md`.

## Execute

```bash
conductor tune $ARGUMENTS --json --agent "Claude Code"
```

The CLI runs a deterministic rule-based classifier (keyword → target file
set: commands / templates / config / conventions). LLM reasoning stays in
the adapter.

## Adapter responsibilities

1. Receive classification:

   ```json
   {"type": "classification", "category": "commands|templates|config|conventions",
    "targets": [".claude/commands/ship.md", ...], "confidence": 0.7,
    "rationale": "..."}
   ```

2. Read each candidate target file and compose a concrete diff proposal.
3. Present the proposal via `AskUserQuestion` with choices
   `["apply", "edit", "skip"]`. On `edit`, loop until the user is satisfied.
4. Apply changes with Edit/Write.
5. Append a dated entry to `.conductor/tune-log.md`:

   ```
   ## 2026-04-23 — {category}
   - Feedback: "..."
   - Applied to: .claude/commands/ship.md
   - Rationale: ...
   ```

6. Tell the CLI you are done via stdin:
   `{"id": "tune-apply", "answer": "applied", "files": [...]}\n`.

## Handoff

```json
{"status": "ok", "phase": "tune/complete", "data": {"applied_files": [...]}}
```

## Guardrails

- Never apply edits silently. The user must approve the concrete diff.
- Host-repo conventions live in `CLAUDE.md` / `.conductor/CONVENTIONS.md`.
  Do not edit package-internal files (`packages/**`, `node_modules/**`) as
  part of tuning — `/conductor:tune` operates on host-repo content only.
