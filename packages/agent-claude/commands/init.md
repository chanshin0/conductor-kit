---
description: Scaffold .conductor/ in this repo (run once per host repository)
argument-hint: "[--project-key ACME] [--jira-url https://org.atlassian.net]"
---

# /conductor:init

**Metaphor**: strike the opening note. Bootstrap the host repo so the rest of
the orchestra (pick / ship / land / recap) has a shared score.

**Scope of this command**: the CLI does everything. The adapter only bridges
prompts and forwards the handoff message.

## Execute

Run (Bash) — pass through `$ARGUMENTS` so flags like `--project-key`,
`--jira-url`, `--label`, `--force` reach the CLI:

```bash
conductor init $ARGUMENTS --json --agent "Claude Code"
```

## JSON protocol

Parse each line of stdout as JSON.

- `{"type": "question", "id": ..., "prompt": ..., "choices": [...]}` — surface
  the question through `AskUserQuestion`. Echo the user's choice back to the
  CLI's stdin as `{"id": "<same id>", "answer": "<choice>"}\n`.
- `{"status": "ok", "phase": "init/complete", "data": {...}, "handoff": {...}}`
  — print `handoff.next_cmd` to the user and stop.
- `{"status": "error", "message": ...}` — stop, report the message.

## Post-run

No code editing, no git work. `/conductor:init` is a scaffold-only command;
the adapter must not touch files in `.conductor/` after the CLI returns.

If the user has not yet set a Jira project key, nudge them to open
`.conductor/workflow.yml` and fill in `jira.project_key` and
`jira.base_url` before running `/conductor:pick`.
