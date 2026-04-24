# @conductor-kit/install

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
