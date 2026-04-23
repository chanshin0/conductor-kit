---
description: Snapshot the current workflow state and suggest the next action
---

# /conductor:where

**Metaphor**: look at the conductor's baton — where are we in the movement?

Read-only status check. No Jira/GitLab calls.

## Execute

```bash
conductor where --json --agent "Claude Code"
```

## JSON protocol

Expect a single line of the form:

```json
{"status": "ok", "phase": "where/snapshot", "data": {...snapshot...}}
```

`data` contains `cwd`, `conductor_initialized`, `git.branch`, `git.clean`,
`active_issue`, `other_issues`, `next_action`.

## Post-run

Print a one-paragraph summary for the user:

- If `conductor_initialized` is false → prompt to run `/conductor:init`.
- If `active_issue` is null → suggest `/conductor:pick <KEY>` or
  `/conductor:draft "<desc>"` depending on whether a Jira key is already known.
- Otherwise print `active_issue.key` with its status and the value of
  `next_action` verbatim (e.g. "다음 → conductor ship"; translate the CLI
  command to the slash form: `conductor ship` → `/conductor:ship`).

Do not modify any files.
