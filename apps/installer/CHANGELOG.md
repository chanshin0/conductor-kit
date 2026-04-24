# @conductor-kit/install

## 0.1.1

### Patch Changes

- d961463: `conductor autopilot` v2 — free-form prompt bootstrap.
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

## 0.1.0

### Minor Changes

- c949044: Initial public slice (v0.1.0).
  - `@conductor-kit/cli` ships `conductor` and `cnd` binaries with commands:
    `init`, `where`, `pick`, `ship`, `land`, `recap`, `draft`, `tune`,
    `autopilot`. Each supports `--json` for adapter bridging and
    `--agent <label>` to populate the authorship footer. `autopilot`
    orchestrates `pick → (agent implements via signal/ack) → ship` for a
    single issue with `--stop-at`, `--ralph`, `--dry-run`.
  - `@conductor-kit/core` exposes the domain-level modules that power the
    CLI: config loader, Jira/GitLab wrappers (`acli` + `glab` with prefill
    fallback), plan/status machinery (`plan-draft → plan-approved → shipped
→ landed`), authorship footer resolver, templates renderer, validation
    runner, UI-change detection, plan-scope parser, and tune classifier.
  - `@conductor-kit/assets` carries neutral workflow templates, seeds, and
    references. All company-specific placeholders replaced with generic
    `<YOUR_PROJECT_KEY>` / `<YOUR_JIRA_BASE_URL>` forms.
  - `@conductor-kit/install` is the host-side installer: `npx @conductor-kit/install
--agent <claude|codex|cursor|all>` copies the matching adapter (slash
    commands, rules, or `AGENTS.md` fragment with idempotent marker-based
    merge) into the host repo plus seeds `.conductor/workflow.yml`. The
    adapter files are bundled into `dist/adapters/` at publish time.

  Agent adapter packages (`agent-claude`, `agent-codex`, `agent-cursor`)
  are intentionally not published — their files are distributed solely
  through `@conductor-kit/install`.

### Patch Changes

- Updated dependencies [c949044]
  - @conductor-kit/core@0.1.0
