---
description: 자율 운행 — pick → 구현 → ship 원샷 (다중 이슈 시 git worktree 병렬)
argument-hint: "<ISSUE-KEY|\"desc\"> [--parallel] [--ralph]"
---

# /conductor:autopilot

**Metaphor**: hand the conductor's baton to the system and let it run the
whole set. The human steps in only when the score deviates.

## Execute

```bash
conductor autopilot $ARGUMENTS --json --agent "Claude Code"
```

CLI responsibilities (deterministic):

- Resolve the issue key (direct arg) or run `conductor draft` first
  (free-form arg) then pick the created draft.
- `conductor pick <KEY>` (with `--auto` if `--ralph` is set, otherwise the
  agent approves after review).
- Emit `{"type": "signal", "step": "implement", "plan": {...}, "conventions": {...}}`
  — control handed to the agent.
- After the agent emits `{"id": "implement-done"}`, run `conductor ship`.
- If `--parallel` and multiple issues were passed, spin up `git worktree`
  subprocesses, one per issue. Aggregate results at the end.

## Adapter responsibilities (implement phase)

1. When the CLI emits `step: "implement"`, load the plan + conventions.
2. Build the change following the plan's 구현 접근 section:
   - Edit / Write as needed.
   - Keep edits inside the plan's 영향 범위. If you need to go outside, pause
     and surface a `deviation` question via `AskUserQuestion`.
3. Run the basic validation loop (`pnpm run lint / type-check / test`) locally
   to de-risk before ship.
4. Echo `{"id": "implement-done"}` to the CLI's stdin so it proceeds to ship.

With `--ralph`: auto-approve plans, auto-accept commit messages, auto-skip
any question that has a "default" choice. Still surface `deviation` and UI
verification failures — those always require human decision.

## Guardrails

- Autopilot is **not** a green light to bypass the plan-approval gate. If a
  plan cannot be auto-approved (missing sections, grey-area questions with
  no default), stop and surface them.
- Never run `git push --force` / `git commit --amend` in autopilot.
- If UI verification (Phase 1.5) fails, halt and wait for the user — do not
  self-retry.

## Handoff

Per issue:

```json
{"status": "ok", "phase": "autopilot/issue-complete",
 "data": {"issue_key": "...", "mr_url": "..."}}
```

Final aggregate (with `--parallel`):

```json
{"status": "ok", "phase": "autopilot/complete",
 "data": {"succeeded": [...], "failed": [...]}}
```
