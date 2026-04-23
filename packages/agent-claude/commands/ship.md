---
description: 검증 → 커밋 → 푸시 → MR → Jira 코멘트 원샷
argument-hint: "[--skip-ui-check <reason>] [--ui-verify <gif-path>]"
---

# /conductor:ship

**Metaphor**: quality-inspect the assembled change, then ship it in a container
(MR).

Jira stays at `IN PROGRESS` — only `/conductor:land` resolves it after merge.

Claude-specific extension: **Phase 1.5 (Claude in Chrome)** runs here.

## Argument passthrough

Forward `$ARGUMENTS` to the CLI so `--skip-ui-check`, `--ui-verify`, and any
future flags reach the core:

```bash
conductor ship $ARGUMENTS --json --agent "Claude Code"
```

The CLI refuses to proceed if `.work/{KEY}.md` is not at status
`plan-approved` or `implementing` — this is the EnterPlanMode replacement
gate. Do not try to bypass it by editing the work file manually.

## Phase 1.5 — Claude in Chrome (UI verification)

The CLI emits this hook when `git diff --stat` touches `src/views/**`,
`src/components/**`, `src/assets/**`, or `src/locales/**` and
`--skip-ui-check` is not set:

```json
{
  "type": "hook",
  "id": "ui-verify",
  "phase": "ship/ui-verify",
  "data": {
    "checklist_path": ".work/{KEY}.md#브라우저-체크리스트",
    "changed_views": ["src/views/..."]
  }
}
```

When you see this hook:

1. Preload browser tools via ToolSearch:
   `mcp__claude-in-chrome__tabs_context_mcp`,
   `mcp__claude-in-chrome__tabs_create_mcp`,
   `mcp__claude-in-chrome__gif_creator`,
   `mcp__claude-in-chrome__form_input`,
   `mcp__claude-in-chrome__find`,
   `mcp__claude-in-chrome__read_console_messages`.
2. Confirm a dev server is up (`http://localhost:*`). If not, stop and ask
   the user to run `pnpm run serve` / `pnpm run mockup`. **Do not auto-start
   it** — mode selection (local / localbe / mockup) is non-deterministic.
3. Load the checklist from `.work/{KEY}.md`. If empty, stop unless
   `--skip-ui-check <reason>` was passed.
4. Start GIF recording to `.work/{KEY}-verify-ui.gif`. Walk the checklist
   step-by-step via `form_input` / `find` / `computer`.
5. Call `read_console_messages` with pattern `Error|Warning|Failed` at each
   step.
6. Stop the GIF. Record per-step PASS/FAIL and the GIF path under
   `.work/{KEY}.md` `## 검증 결과 > 브라우저`.
7. Echo the result back to the CLI's stdin:
   `{"id": "ui-verify", "answer": "pass", "gif_path": ".work/{KEY}-verify-ui.gif"}\n`
   or `{"id": "ui-verify", "answer": "fail", "details": "..."}\n`.

Never call `javascript_tool` in a way that would open an `alert` / `confirm` /
`prompt`: that blocks the extension.

## Phase 1.8 / 2 / 3 — CLI-driven

The CLI handles: goal-backward reflection prompt, commit message drafting
(via template), commit + push, MR creation (`@conductor-kit/core/gitlab.ts`
with exit 0 / 10 / 20 contract), Jira ship comment (`acli`).

When the CLI emits `{"type": "question", "id": "commit-message-approval", ...}`
or similar, bridge via `AskUserQuestion`. When it emits a
`{"type": "question", "id": "deviation", "choices": ["extend-plan","revert","ignore"]}`
(plan-scope deviation), route the answer back; the CLI patches `.work/{KEY}.md`
accordingly.

## Authorship footer

The CLI renders all output artifacts (MR body, Jira ship comment, work log)
with the footer:

```
Generated via `conductor ship` — agent Claude Code · conductor-kit v{CLI_VERSION} · user {USER}
```

Because this adapter always passes `--agent "Claude Code"`, the `{AGENT}`
slot is always `Claude Code`. Edit the hardcoded label in this file if you
want per-model attribution (e.g. `Claude Opus 4.7`).

## Handoff (CLI emits one of these)

**MR confirmed (glab exit 0)**:

```json
{"status": "ok", "phase": "ship/complete", "data": {"mr_url": "..."},
 "handoff": {"next_cmd": "conductor land"}}
```

Render:

```
┌─────────────────────────────────────────────┐
│ 출하 완료: {subject}                          │
│ MR: {mr_url}                                 │
│ Jira: IN PROGRESS (머지 대기)                 │
│ 다음: 리뷰어 머지 후 → /conductor:land    │
└─────────────────────────────────────────────┘
```

**Prefill fallback (glab exit 10)**:

```json
{"status": "ok", "phase": "ship/mr-pending", "data": {"prefill_url": "..."},
 "handoff": {"message": "Open link → Create → then /conductor:land"}}
```

Render with "출하 준비 완료 (MR 미확정)" and the prefill link.

## Guardrails

- Never `git commit --amend` on a hook failure. Fix the cause, stage, make a
  new commit.
- Never `--no-verify`.
- Never edit files in `.work/` while the CLI is running — write only after
  the CLI hands off control back to the agent.
