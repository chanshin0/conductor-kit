# conductor:land

After the MR is merged in the GitLab UI, this command transitions Jira to
RESOLVE and cleans up the local branch.

## Run

```bash
conductor land $ARGUMENTS --json --agent "Codex"
```

With no argument the CLI infers the Jira key from the current branch name
(`feat/ACME-42-*` → `ACME-42`). Pass the key explicitly if you are on a
different branch:

```bash
conductor land ACME-42 --json --agent "Codex"
```

## Typical interactive exchange

The CLI may ask:

```json
{"type": "question", "id": "not-merged",
 "prompt": "Branch not detected as merged into origin/main.",
 "choices": ["force", "abort"]}
```

Only answer `force` after the user visually confirms the merge (e.g. a
squash-merge with a new SHA). Otherwise `abort`.

## Handoff

```json
{"status": "ok", "phase": "land/complete",
 "data": {"issue_key": "...", "merged_into": "main",
          "jira_transitioned": true, "local_branch_deleted": true},
 "handoff": {"next_cmd": "conductor recap <KEY>"}}
```

Render a short summary, then suggest `conductor recap <KEY>`.

## Guardrails

- Do not run `git push --force`, `git reset --hard`, or branch deletes
  manually. The CLI owns all of those.
- If `jira_transitioned: false`, surface the warning; the user may need to
  re-auth `acli` and retry via Jira UI.
