# conductor:autopilot

Unattended pick → implement → ship loop. One issue, or many issues in
parallel (via `git worktree` subprocesses, CLI-driven).

## Run

```bash
conductor autopilot $ARGUMENTS --json --agent "Codex"
```

Flags:

- `--parallel` — spin up one worktree per issue (issues passed as repeated
  args or via stdin list).
- `--ralph` — take the default on every prompt. Questions marked as
  "always requires human" (plan deviation, UI verify fail) still pause.

## Flow

1. CLI runs `conductor pick <KEY>` (or drafts first if given a free-form
   description).
2. CLI emits `{"type": "signal", "step": "implement", "plan": {...},
   "conventions": {...}}` — control handed to you.
3. You implement the change:
   - Edit/Write inside the plan's 영향 범위 only.
   - Run `pnpm run lint`, `pnpm run type-check`, related tests locally.
   - If you need to edit outside the plan, surface a `deviation` question
     and wait for the user's decision.
4. When done, pipe back `{"id": "implement-done"}`.
5. CLI runs `conductor ship` and emits the final handoff.

## Adapter responsibilities

- Keep the plan and conventions loaded from the signal payload. Do not
  re-read them from disk; they are already the merged view.
- With `--ralph`, accept commit messages and skip non-critical questions
  automatically — but **never** skip plan deviation or UI verify failures.
- If the CLI reports per-issue failure in parallel mode, continue with the
  remaining issues; do not abort the whole batch.

## Handoff (per issue)

```json
{"status": "ok", "phase": "autopilot/issue-complete",
 "data": {"issue_key": "...", "mr_url": "..."}}
```

## Handoff (batch)

```json
{"status": "ok", "phase": "autopilot/complete",
 "data": {"succeeded": [...], "failed": [...]}}
```

## Guardrails

- Autopilot does not bypass the plan-approval gate. If the plan can't be
  auto-approved (missing sections, unresolved grey-area questions),
  autopilot stops and waits.
- No `git push --force`, no `git commit --amend`, no `--no-verify`, ever.
