# Contributing

Thanks for your interest. This project is in early development — PRs, issues, and design feedback are all welcome.

## Development setup

```sh
git clone https://github.com/chanshin0/conductor-kit.git
cd conductor-kit
pnpm install
pnpm -r build
pnpm -r test
```

Requirements:

- Node.js >= 20
- pnpm >= 10

## Workflow

1. Open an issue first for anything beyond a one-line fix. Describe the problem, not just the patch.
2. Create a feature branch: `feat/<scope>-<slug>` or `fix/<scope>-<slug>`.
3. Make changes. Each change that affects a publishable package needs a changeset:
   ```sh
   pnpm changeset
   ```
   Pick the affected packages and bump type (patch / minor / major) and write a short user-facing summary.
4. Run the full check locally before opening a PR:
   ```sh
   pnpm -r lint
   pnpm -r typecheck
   pnpm -r test
   ```
5. Open a PR against `main`. CI must pass.

## Commit convention

Conventional Commits style:

```
<type>(<scope>): <subject>
```

- `type`: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `ci`
- `scope`: package or area (e.g. `core`, `cli`, `agent-claude`, `docs`)
- Subject: imperative, ≤ 70 chars

Examples:

```
feat(cli): add --agent flag for authorship footer
fix(core): handle missing glab binary in create-mr
docs(readme): clarify quickstart for Codex CLI
```

## Package layout

- `packages/core` — pure domain logic. No CLI, no agent specifics.
- `packages/cli` — the `conductor` binary. Thin; delegates to core.
- `packages/assets` — templates, config defaults, reference docs. Static only.
- `packages/agent-*` — adapters for each AI agent. Keep these minimal — logic belongs in core.
- `apps/installer` — `conductor-install` CLI for seeding adapters into host repos.

## What NOT to put in PRs

- Company-specific identifiers (Jira project keys, internal domains, product codenames). CI will fail on `CDS|okestro|ceph` patterns.
- Agent-specific logic leaking into `packages/core`.
- Features for hypothetical future needs — keep the scope tight.

## Release

Maintainers only. `main` push triggers a Changesets release PR. Merging that PR publishes to npm.
