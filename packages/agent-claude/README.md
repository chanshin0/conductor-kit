# @conductor-kit/agent-claude

Claude Code adapter for [conductor-kit](https://github.com/chanshin0/conductor-kit).

Each slash command (`/conductor:pick`, `/conductor:ship`, ...) is a thin wrapper
around the `conductor` CLI. The CLI owns Jira/GitLab/Git/validation orchestration
(deterministic). The adapter owns conversation UX: `AskUserQuestion`,
`EnterPlanMode`, `mcp__claude-in-chrome__*` (Claude-specific), and code editing.

## Install

This package is not published to npm. It is copied into a host repository by
`npx @conductor-kit/installer --agent claude`.

## Convention

- Every command body invokes `conductor <cmd> $ARGUMENTS --json --agent "Claude Code"`.
- The agent label is **hardcoded per file** — runtime `--agent` always wins over
  `.conductor/workflow.yml`'s `agent.label`, so the footer shows `Claude Code`
  regardless of host-repo default. Rename the label to include your model name
  (e.g. `Claude Opus 4.7`) if you want per-model attribution.
- `--json` engages the stdin protocol. The adapter parses the stdout JSON
  stream and bridges questions to `AskUserQuestion`.
- When the CLI emits `status: "deferred-to-agent"`, the adapter proceeds with
  code editing / conversation. When it emits `status: "ok"`, the adapter
  reports the handoff message.

## Claude-only extensions

- `/conductor:pick` wraps the plan-draft phase with `EnterPlanMode` so the
  agent is blocked from editing code until `ExitPlanMode`. Other agents rely on
  the CLI's `plan-draft → plan-approved` gate alone.
- `/conductor:ship` runs Claude in Chrome (Phase 1.5) for UI verification when
  `src/views/**` or `src/components/**` files are in the diff. Other agents
  `--skip-ui-check <reason>` or use `@conductor-kit/ui-verify` (Playwright).
