---
description: 자율 운행 — pick → 구현 → ship 원샷 (단일), 여러 이슈 시 Task 병렬
argument-hint: "<ISSUE-KEY|\"desc\"> [ISSUE-KEY ...] [--ralph]"
---

# /conductor:autopilot

**Metaphor**: hand the conductor's baton to the system and let it run the
whole set. The human steps in only when the score deviates.

## Modes

Parse `$ARGUMENTS`: extract tokens matching `^[A-Z][A-Z0-9]+-\d+$` as issue
keys. Count = N.

| N | Mode | How |
|---|---|---|
| 0 (free-form only) | Single — draft bootstrap | CLI renders draft + emits `draft-post` signal |
| 1 | Single | Direct `conductor autopilot <KEY>` |
| ≥ 2 | **Multi — Task parallel** | Spawn N subagents with `isolation: "worktree"` |

## Single mode (N ≤ 1)

```bash
conductor autopilot $ARGUMENTS --json --agent "Claude Code"
```

CLI drives the deterministic parts; the agent handles `implement` via a
signal/ack exchange on stdin/stdout.

### Signal/ack protocol

The CLI emits one of two signals; reply on stdin with the matching ack.

| Signal | Payload | Your job | Ack to send |
|---|---|---|---|
| `{"type":"signal","step":"draft-post",...}` | hint text | Use acli (or tell the user) to post the draft to Jira; capture the returned key | `{"id":"draft-posted","issue_key":"<KEY>"}` |
| `{"type":"signal","step":"implement",...}` | `issue_key`, `work_file` | Read the work file, implement per the plan, run local validation | `{"id":"implement-done"}` |

Keep each exchange single-shot: one signal in, one ack out.

### Implement-phase responsibilities

1. Read the work file at the path the CLI gave you.
2. Build the change following the plan's 구현 접근 section.
   - Edit/Write as needed.
   - Stay inside the plan's 영향 범위. If you must go outside, pause and
     surface a deviation question via `AskUserQuestion` before proceeding.
3. Run the basic validation loop (`pnpm run lint / type-check / test`)
   locally to de-risk before `ship` runs.
4. Reply `{"id":"implement-done"}` on stdin.

With `--ralph`: the CLI promotes `--auto`, so plan-approval and
commit-message gates are skipped. Deviation, UI-verify failures, and
validation failures still halt — they always need a human call.

## Multi mode (N ≥ 2) — Task parallel

The CLI has no native `--parallel` — coordinating multiple child CLIs over a
single stdout is a non-starter. Instead, parallelize at this layer using
**Task subagents with isolated worktrees**.

Steps:

1. **Pre-flight** (in the main session, before spawning):
   - `git status --porcelain` must be empty. Otherwise stop and ask the user
     to stash/commit — multi-mode won't run on a dirty tree.
   - For each issue key, verify it exists via `acli jira workitem view <KEY>`.
     Drop unreachable keys from the spawn set, report them in the final
     summary.

2. **Spawn N subagents in a single message** (parallel tool calls):

   ```
   Task(
     subagent_type: "general-purpose",
     description: "autopilot <KEY>",
     isolation: "worktree",
     prompt: |
       Run `conductor autopilot <KEY> --ralph --json --agent "Claude Code"`
       in this worktree. Follow the single-mode signal/ack protocol in
       /conductor:autopilot. Grey-area policy: consult CONVENTIONS.md +
       CLAUDE.md first, record the call in `.work/<KEY>.md`'s 결정 메모,
       proceed; only fail if the tradeoff is genuinely ambiguous.
       Lockfile rule: never commit pnpm-lock.yaml / package-lock.json /
       yarn.lock unless dependencies were explicitly added/removed.
       Stall rule: if any external process hangs > 90s with no progress,
       abort with "<stage> stalled". Return one line:
       `<KEY> | <status> | <MR url or reason> | <worktree path>`.
   )
   ```

3. **Aggregate results** into a table:

   ```
   | 이슈 | 결과 | MR | 워크트리 |
   |---|---|---|---|
   | ... | ok / failed | ... | ... |
   ```

4. Worktrees are **not** auto-cleaned — the user decides when to remove them
   with `git worktree remove <path>` after merge.

Multi-mode implicitly runs every subagent with `--ralph` (single session
can't serve N plan-approval gates). Safety gates (deviation, UI, validation,
3-in-a-row failures) remain enforced per subagent.

## Guardrails

- Plan-approval gate is not something `--ralph` negotiates away per issue —
  if a plan is missing sections or has unresolved grey areas with no default,
  stop and surface them before implement.
- Never run `git push --force` / `git commit --amend` inside autopilot.
- UI verification (Phase 1.5) failure halts — do not self-retry.
- In multi-mode, a subagent that stalls or hits the 3-failure safety cap
  fails out of the batch; it does not block the others.

## Handoff

Single mode (per issue) — the CLI emits:

```json
{"status":"ok","phase":"ship/complete",
 "data":{"issue_key":"...","mr_url":"..."}}
```

Multi mode — aggregate the per-subagent lines into the table above and
append the follow-up hint:

> Next: review each MR → `/conductor:land <KEY>` → `/conductor:recap <KEY>`.
> Clean worktrees with `git worktree remove <path>` after merge.
