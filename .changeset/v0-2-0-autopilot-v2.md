---
'@conductor-kit/cli': minor
'@conductor-kit/install': patch
---

`conductor autopilot` v2 — free-form prompt bootstrap.

- **New**: `conductor autopilot "<free-form description>"` renders a draft
  via `conductor draft` internally, emits a `draft-post` signal over
  stdin/stdout, and waits for the adapter to reply with the posted Jira
  issue key — then continues with the normal pick → implement → ship
  loop. The existing `conductor autopilot <KEY>` path is unchanged.
- The "draft never auto-creates" invariant is preserved: the adapter /
  user is still the one that actually runs `acli jira workitem create`.
- TTY (non-JSON) mode rejects free-form input with a clear pointer at
  `conductor draft "..."` + `conductor autopilot <KEY>` as the manual
  two-step path.

`@conductor-kit/install` bundles the updated adapter markdown guides
(Claude Code / Codex / Cursor) that document the signal/ack protocol
(`draft-post` + `implement`), the Claude Code Multi mode pattern
(`Task` subagent with `isolation: "worktree"`), and the removal of the
old `--parallel` CLI flag that never actually existed.
