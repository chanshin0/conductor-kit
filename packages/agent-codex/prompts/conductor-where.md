# conductor:where

Read-only snapshot of the current workflow state.

Run:

```bash
conductor where --json --agent "Codex"
```

Expect one line:

```json
{"status": "ok", "phase": "where/snapshot", "data": {...}}
```

`data` fields: `cwd`, `conductor_initialized`, `git.branch`, `git.clean`,
`active_issue`, `other_issues`, `next_action`.

Render a 3–5 line summary for the user. If `next_action` references a CLI
command, surface it verbatim — the user can run it directly.

Do not modify any files.
