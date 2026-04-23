# /conductor-init

One-time scaffold for `.conductor/` in this repo.

Run:

```bash
conductor init $ARGUMENTS --json --agent "Cursor"
```

Flags: `--project-key ACME`, `--jira-url https://org.atlassian.net`,
`--label "Cursor"`, `--force`.

## Bridge the JSON stream

- `{"type": "question", "id": ..., ...}` — ask the user, echo the answer
  back to stdin as `{"id": ..., "answer": ...}\n`.
- `{"status": "ok", ...}` — print the handoff and stop.

## After

No code editing. If `.conductor/workflow.yml` was freshly created, tell
the user to fill in `jira.project_key` and `jira.base_url` before running
`conductor pick <KEY>`.
