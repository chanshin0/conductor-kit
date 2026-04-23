# conductor-kit

> Team workflow automation that conducts multiple AI agents — Claude Code, Codex CLI, and Cursor — through a single shared ritual.
>
> 여러 AI 에이전트(Claude Code · Codex CLI · Cursor)를 하나의 팀 워크플로우로 지휘하는 멀티 에이전트 오케스트레이션 킷.

**Status**: 🚧 Early development. API / CLI names may change before `v0.1.0`.

## Why

Teams that adopt multiple AI coding agents end up with fragmented workflows — same Jira issue handled by Claude on one branch, Cursor on another, Codex CLI in a third terminal, each with its own prompts, conventions, and shell scripts. `conductor-kit` extracts the workflow itself into a neutral CLI so the agent becomes interchangeable.

- **Single CLI core** (`conductor`) handles Jira transitions, branch naming, GitLab MR creation, validation, and state files deterministically.
- **Thin agent adapters** for Claude Code, Codex CLI, and Cursor call into the CLI via a stdin JSON protocol — no duplicated prompts.
- **One state file per issue** (`.work/{KEY}.md`) so pausing in one agent and resuming in another Just Works.
- **Authorship footer** on every MR / Jira comment / Recap records which agent model actually did the work.

## Quickstart (draft)

```sh
# Install the neutral CLI globally
npm install -g @conductor-kit/cli

# In any repo, pick your agent adapter
npx conductor-install --agent claude   # or: --agent codex / --agent cursor / --agent all

# Drive a Jira issue end-to-end
conductor init --project-key MYKEY
conductor pick MYKEY-123
# ... implement ...
conductor ship
conductor land
conductor recap
```

## Commands

| CLI                                      | Purpose                                                 |
| ---------------------------------------- | ------------------------------------------------------- |
| `conductor init`                         | Scaffold `.conductor/` in the current repo              |
| `conductor pick <KEY>`                   | Fetch Jira issue, create branch, transition, draft plan |
| `conductor ship`                         | Validate → commit → push → open MR → Jira comment       |
| `conductor land [<KEY>]`                 | After merge: transition to Resolved, clean local branch |
| `conductor recap [<KEY>] [--confluence]` | Post result comment / Confluence page draft             |
| `conductor draft "<desc>"`               | Draft a new Jira issue with dedup scan                  |
| `conductor where`                        | Snapshot of current state                               |
| `conductor tune "<feedback>"`            | Classify workflow feedback and propose edits            |
| `conductor autopilot <KEY\|desc>`        | pick → implement → ship loop                            |

## Architecture

```
conductor-kit/
├── packages/core/        # @conductor-kit/core   — pure domain logic
├── packages/cli/         # @conductor-kit/cli    — `conductor` binary
├── packages/assets/      # @conductor-kit/assets — templates, defaults, references
├── packages/agent-claude # Claude Code plugin (CLI-delegating)
├── packages/agent-codex  # Codex CLI bundle (AGENTS.md + prompts)
├── packages/agent-cursor # Cursor bundle (.cursor/rules + commands)
└── apps/installer        # `npx conductor-install`
```

See `docs/ARCHITECTURE.md` once it lands.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). This project follows [Contributor Covenant 2.1](./CODE_OF_CONDUCT.md).

## License

[MIT](./LICENSE) © Dongchan Shin (chanshin0)
