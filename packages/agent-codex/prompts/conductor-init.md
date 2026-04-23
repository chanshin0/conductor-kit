# conductor:init

One-time scaffold for `.conductor/` in this host repo.

Run:

```bash
conductor init $ARGUMENTS --json --agent "Codex"
```

Useful flags: `--project-key ACME`, `--jira-url https://org.atlassian.net`,
`--label "Codex"`, `--force`.

## Bridging the stdin JSON protocol

With `--json`, stdout emits one JSON object per line. Your job:

- `{"type": "question", "id": ..., "prompt": ..., "choices": [...]}` — ask
  the user in plain text, then pipe back the answer as a single line on the
  CLI's stdin: `{"id": "<same id>", "answer": "<choice>"}`.
- `{"status": "ok", "phase": "init/complete", "data": {...}, "handoff": {...}}`
  — print the summary and stop.
- `{"status": "error", "message": ...}` — stop and surface the message.

## Post-run

No code editing, no git work. `/conductor:init` only touches `.conductor/`.

If the CLI reports that `.conductor/workflow.yml` was freshly created, tell
the user to fill in `jira.project_key` and `jira.base_url` before running
`conductor pick <KEY>`.
