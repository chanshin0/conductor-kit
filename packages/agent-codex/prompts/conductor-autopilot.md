# conductor:autopilot

Unattended pick → implement → ship loop for a single Jira issue. Multi-issue
batches run sequentially in Codex (no worktree subagent primitive); for true
parallelism, use the Claude Code adapter instead.

## Run

```bash
conductor autopilot $ARGUMENTS --json --agent "Codex"
```

Positional:

- `<ISSUE-KEY>` — go straight to pick.
- `"<free-form description>"` — CLI renders a draft, emits a `draft-post`
  signal, waits for you to post it and reply with the key.

Flags:

- `--ralph` — the CLI promotes `--auto`, so plan-approval and commit-message
  gates are taken silently. Deviation / UI-verify / validation failures
  still halt; they always need a human call.

## Signal/ack protocol

The CLI emits one of two signals on stdout. Reply on stdin with the matching
ack — one signal in, one ack out.

| Signal | Payload | Your job | Ack to send |
|---|---|---|---|
| `{"type":"signal","step":"draft-post",...}` | hint text | Post the draft to Jira via `acli` (or have the user do it); capture the returned key | `{"id":"draft-posted","issue_key":"<KEY>"}` |
| `{"type":"signal","step":"implement",...}` | `issue_key`, `work_file` | Read the work file, implement per the plan, run local validation | `{"id":"implement-done"}` |

## Implement-phase responsibilities

1. Read the work file at the path the CLI gave you.
2. Build the change following the plan's 구현 접근 section.
   - Edit/Write inside the plan's 영향 범위 only.
   - Run `pnpm run lint`, `pnpm run type-check`, related tests locally.
   - If you must edit outside the plan, pause and ask the user before
     proceeding — do not silently expand scope.
3. Pipe back `{"id": "implement-done"}` on stdin.
4. CLI runs `conductor ship` and emits the final handoff.

## Multi-issue batches

Process them sequentially:

```bash
for KEY in $ARGUMENTS; do
  conductor autopilot "$KEY" --ralph --json --agent "Codex"
done
```

Keep a running summary: `<KEY> | <result> | <MR url or reason>`. Continue
on per-issue failure; aggregate at the end. Batch mode implies `--ralph`.

For concurrent worktree-based parallelism, use the Claude Code adapter —
its Task/subagent/worktree primitive is what makes true parallel safe.

## Handoff (per issue)

CLI emits on success:

```json
{"status":"ok","phase":"ship/complete",
 "data":{"issue_key":"...","mr_url":"..."}}
```

## Guardrails

- Autopilot does not bypass the plan-approval gate. If the plan is missing
  sections or has unresolved grey-area questions with no default, stop and
  surface them before implement.
- No `git push --force`, no `git commit --amend`, no `--no-verify`, ever.
- UI verification failure halts; do not self-retry.
