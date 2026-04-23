# conductor-install

One-shot installer for [conductor-kit](https://github.com/chanshin0/conductor-kit)
agent adapters. Copies the chosen adapter's files into a host repository and
seeds `.conductor/` with the default workflow config.

## Usage

```bash
# Install for one agent
npx conductor-install --agent claude  --label "Claude Opus 4.7" --project-key ACME
npx conductor-install --agent codex   --label "Codex GPT-5"      --project-key ACME
npx conductor-install --agent cursor  --label "Cursor / Claude Sonnet 4.6" --project-key ACME

# Install for all three at once
npx conductor-install --agent all --label "Claude Opus 4.7" --project-key ACME

# Preview without writing anything
npx conductor-install --agent all --dry-run

# Overwrite existing adapter files (otherwise they are skipped)
npx conductor-install --agent claude --force
```

## Flags

| Flag | Purpose |
|---|---|
| `--agent <claude\|codex\|cursor\|all>` | **Required.** Which adapter(s) to install. |
| `--label "<string>"` | Agent label recorded as default in `.conductor/workflow.yml` (appears in authorship footer). Defaults to a per-agent display name when `--agent` is a single agent. |
| `--project-key ACME` | Jira project key seeded into `.conductor/workflow.yml`. |
| `--jira-url https://org.atlassian.net` | Jira base URL seeded into `.conductor/workflow.yml`. |
| `--cwd <path>` | Host repository root (default: `process.cwd()`). |
| `--force` | Overwrite existing adapter files instead of skipping. |
| `--dry-run` | Report what would change without touching the filesystem. |

## What gets installed

| Agent | Target files |
|---|---|
| `claude` | `<repo>/.claude/commands/conductor-{init,where,pick,ship,land,recap,draft,tune,autopilot}.md` (9) |
| `codex`  | `<repo>/.codex/prompts/conductor-{...}.md` (9) + merge into `<repo>/AGENTS.md` between `<!-- conductor-kit begin -->` / `<!-- conductor-kit end -->` markers |
| `cursor` | `<repo>/.cursor/rules/conductor-{workflow,ui,conventions}.mdc` (3) + `<repo>/.cursor/commands/conductor-{...}.md` (9) |
| *(all)*  | `<repo>/.conductor/workflow.yml`, `<repo>/.conductor/CONVENTIONS.md`, `<repo>/.conductor/tune-log.md` — via `scaffoldConductorDir` from `@conductor-kit/core`. |

## Idempotency

- Existing files are **skipped** by default. Re-running the installer is
  safe — pass `--force` to overwrite.
- `AGENTS.md` uses marker-based merge: user-authored content before and
  after the markers is preserved; only the content *between* the markers is
  replaced. Already-current sections are reported as `noop`.

## Flat install vs Claude marketplace plugin

The `claude` installer copies command files directly into
`<repo>/.claude/commands/` with a `conductor-` prefix (`/conductor-pick`
etc.). If you prefer the marketplace plugin route — which surfaces the
commands as `/conductor:pick` — install
`@conductor-kit/agent-claude` via `/plugin marketplace add ...` instead.
The two paths are mutually exclusive; pick one per repo.
