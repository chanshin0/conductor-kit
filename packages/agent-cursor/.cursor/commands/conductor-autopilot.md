# /conductor-autopilot

Unattended pick → implement → ship loop. Multiple issues run in parallel
via `git worktree` subprocesses (CLI-driven).

## Run

```bash
conductor autopilot $ARGUMENTS --json --agent "Cursor"
```

Flags:

- `--parallel` — one worktree per issue.
- `--ralph` — take the default on every non-critical prompt. Plan
  deviations and UI-verify failures still require human input.

## Flow

1. CLI runs `conductor pick <KEY>` (or drafts first for free-form input).
2. CLI emits `{"type": "signal", "step": "implement",
   "plan": {...}, "conventions": {...}}` — you take over.
3. Implement inside the plan's 영향 범위:
   - Edit / Write as needed.
   - Run `pnpm run lint`, `pnpm run type-check`, related tests locally.
   - On scope drift, surface `deviation` and wait.
4. Echo `{"id": "implement-done"}` when ready.
5. CLI runs `conductor ship`, emits final handoff.

## Adapter responsibilities

- Use the plan + conventions from the signal payload as the single source
  of truth; do not re-read them from disk.
- `--ralph` accepts default answers automatically **except** for plan
  deviations and UI-verify failures — those always pause.
- In parallel mode, do not abort the batch when one issue fails; continue.

## Guardrails

- Autopilot does not bypass the plan-approval gate.
- No `git push --force`, no `git commit --amend`, no `--no-verify`.

## Handoffs

Per issue:

```json
{"status": "ok", "phase": "autopilot/issue-complete",
 "data": {"issue_key": "...", "mr_url": "..."}}
```

Batch:

```json
{"status": "ok", "phase": "autopilot/complete",
 "data": {"succeeded": [...], "failed": [...]}}
```
