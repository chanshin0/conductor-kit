# /conductor-autopilot

Unattended pick → implement → ship loop for a single Jira issue. Multi-issue
batches are processed sequentially in Cursor; true worktree parallelism is
Claude-Code-only.

## Run

```bash
conductor autopilot $ARGUMENTS --json --agent "Cursor"
```

Positional:

- `<ISSUE-KEY>` — skip draft, go straight to pick.
- `"<free-form description>"` — CLI renders a draft, emits `draft-post`
  signal, and waits for you to post + reply with the returned key.

Flags:

- `--ralph` — the CLI promotes `--auto`, so plan-approval and commit-message
  gates pass silently. Deviation / UI-verify / validation failures still
  halt.

## Signal/ack protocol

CLI emits one signal, you reply with the matching ack on stdin — one round
trip, never two at once.

| Signal | Payload | Your job | Ack |
|---|---|---|---|
| `{"type":"signal","step":"draft-post",...}` | hint | Post draft via `acli` (or ask the user) and capture the Jira key | `{"id":"draft-posted","issue_key":"<KEY>"}` |
| `{"type":"signal","step":"implement",...}` | `issue_key`, `work_file` | Read the work file, implement per the plan, run local validation | `{"id":"implement-done"}` |

## Implement-phase responsibilities

1. Read the work file path the CLI gave you.
2. Build the change following the plan's 구현 접근 section.
   - Edit / Write inside the plan's 영향 범위 only.
   - On scope drift, pause and ask the user before editing outside scope.
   - Run `pnpm run lint`, `pnpm run type-check`, related tests locally.
3. Echo `{"id":"implement-done"}` on stdin when ready.

## Multi-issue batches

Cursor has no native worktree subagent primitive, so run sequentially:

```bash
for KEY in $ARGUMENTS; do
  conductor autopilot "$KEY" --ralph --json --agent "Cursor"
done
```

Keep a running per-issue summary and continue on individual failures. Batch
mode implies `--ralph`. For concurrent execution, use the Claude Code
adapter — it's the only one with Task + isolation=worktree.

## Guardrails

- Plan-approval gate stays enforced — if the plan is missing sections or has
  unresolved grey-area questions with no default, stop and surface them.
- No `git push --force`, no `git commit --amend`, no `--no-verify`.
- UI verification failure halts; do not self-retry.

## Handoff (per issue)

CLI emits on success:

```json
{"status":"ok","phase":"ship/complete",
 "data":{"issue_key":"...","mr_url":"..."}}
```
