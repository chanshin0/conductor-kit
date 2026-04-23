---
description: MR 수동 머지 후 — Jira RESOLVE 전환 + 로컬 정리
argument-hint: "[<ISSUE-KEY>]  (inferred from branch if omitted)"
---

# /conductor:land

**Metaphor**: after the container touches down, stamp the paperwork.

Run **after** the MR is merged in GitLab UI / CI. This command never merges
or force-pushes.

## Execute

```bash
conductor land $ARGUMENTS --json --agent "Claude Code"
```

The CLI infers the Jira key from the current branch (`feat/ACME-42-*` →
`ACME-42`) when `$ARGUMENTS` is empty. It fetches `origin/main`, verifies the
feature branch is merged, checks out the target branch, pulls `--ff-only`,
transitions Jira to the configured `resolve.to`, updates
`.work/{KEY}.md` status to `landed`, and deletes the local feature branch.

## JSON protocol

Pass through any `type: "question"` to `AskUserQuestion`. Typical question:

```json
{"type": "question", "id": "not-merged",
 "prompt": "Branch not detected as merged into origin/main.",
 "choices": ["force", "abort"]}
```

Only answer `force` when the user has visually confirmed the merge (e.g. a
rebase-merge with a new SHA that tripped the `is-ancestor` check).

## Handoff

```json
{"status": "ok", "phase": "land/complete",
 "data": {"issue_key": "...", "merged_into": "main",
          "jira_transitioned": true, "local_branch_deleted": true},
 "handoff": {"next_cmd": "conductor recap {KEY}"}}
```

Render:

```
┌─────────────────────────────────────────┐
│ 착륙 완료: {KEY}                         │
│ 머지: → {merged_into}                    │
│ Jira: RESOLVE                           │
│ 로컬 브랜치: 삭제됨                       │
│ 다음: → /conductor:recap {KEY}        │
└─────────────────────────────────────────┘
```

## Guardrails

- Do not run `git push --force`, `git reset --hard`, or branch deletes
  yourself — the CLI owns these.
- If Jira transition fails (auth / permissions), the CLI marks
  `jira_transitioned: false` and surfaces a warning. Relay it; do not retry
  silently.
