# Artifact Type Registry

Single source of truth for every file the conductor-kit workflow reads or writes. Each entry lists **location**, **owner**, **purpose**, **lifecycle**, **consumed-by**, and **sync-with**. The `conductor tune` classifier walks this registry to expand the impact radius of any feedback-driven edit.

Update this file first when introducing a new artifact type or changing the structure of an existing one.

## Glossary

- **Owner (kit / host-repo)** — Who is allowed to edit. `kit` = only inside `conductor-kit` monorepo. `host-repo` = edited freely in each repo that installed an adapter.
- **Consumed by** — Commands that read or write this artifact.
- **Sync with** — Other artifacts that **must** be updated together when this one changes.

---

## Kit-owned artifacts

### `@conductor-kit/assets/workflow/config.defaults.yml`

- **Owner**: kit
- **Purpose**: Repo-agnostic defaults (Jira transitions, prefix map, commit format, validation commands, authorship-footer template).
- **Lifecycle**: Updated when default shape changes. Deep-merged with host `.conductor/workflow.yml` at runtime.
- **Consumed by**: `@conductor-kit/core` `loadConfig()`
- **Sync with**: `@conductor-kit/core` type definitions (`WorkflowConfig`), `docs/SPEC.md`

### `@conductor-kit/assets/workflow/templates/*.md`

- **Owner**: kit
- **Purpose**: Human-facing output templates — plan, MR body, Jira ship comment, Recap comment, Recap page, commit message, work-context skeleton, draft issue.
- **Consumed by**: `conductor pick | ship | recap | draft | land`
- **Sync with**: `@conductor-kit/core` template renderer, `docs/SPEC.md` (phase-by-phase output contract)

### `@conductor-kit/assets/references/artifact-types.md` (this file)

- **Owner**: kit
- **Purpose**: Registry consumed by `conductor tune` when classifying feedback and expanding the sync radius.
- **Sync with**: Every artifact entry when a new type is added

### `@conductor-kit/assets/references/conventions.md`

- **Owner**: kit (as a **template**)
- **Purpose**: A neutral, self-contained example of a team conventions document. Host repos copy this into `.conductor/CONVENTIONS.md` and edit freely.
- **Consumed by**: `conductor pick` Phase 0 (context load)

### `@conductor-kit/agent-*/…`

- **Owner**: kit
- **Purpose**: Thin adapter files (Claude plugin commands, Codex prompts, Cursor rules/commands) that delegate to the CLI.
- **Lifecycle**: Copied into host repos by `conductor-install`. Never edited in-place in the host repo (changes upstream in the kit).

---

## Host-repo-owned artifacts

### `.conductor/workflow.yml`

- **Owner**: host-repo
- **Purpose**: Repo-specific overrides — project key, Jira base URL, validation commands that differ from defaults, GitLab project path.
- **Consumed by**: `conductor` (all commands) via `loadConfig`

### `.conductor/CONVENTIONS.md`

- **Owner**: host-repo
- **Purpose**: Team-specific architecture / tech-stack / style rules. Loaded into agent context at `conductor pick`.

### `.conductor/tune-log.md`

- **Owner**: host-repo
- **Purpose**: Append-only record of `conductor tune` applications for this repo.

### `.work/{ISSUE_KEY}.md`

- **Owner**: host-repo (per-session)
- **Purpose**: The live state file for a single Jira issue. Status field gates `conductor ship` (see "plan-first" contract in `docs/SPEC.md`).
- **Lifecycle**: Created by `conductor pick`, updated by every subsequent command, archived or removed after `conductor land + recap`.

### `.work/.lock-{ISSUE_KEY}`

- **Owner**: host-repo
- **Purpose**: Simple file lock to serialize concurrent writes when two agents touch the same issue.

---

## Cross-cutting notes

- **Authorship footer placeholders** (`{COMMAND}`, `{AGENT}`, `{CLI_VERSION}`, `{USER}`) are rendered by `@conductor-kit/core`. Never hardcode the values in templates.
- **`sync-with` is transitive but bounded**: the tune classifier expands at most 2 hops to avoid unbounded cascades.
