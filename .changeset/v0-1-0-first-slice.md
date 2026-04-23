---
'@conductor-kit/core': minor
'@conductor-kit/cli': minor
'@conductor-kit/assets': minor
---

Initial public slice (v0.1.0).

- `@conductor-kit/cli` ships `conductor` and `cnd` binaries with commands:
  `init`, `where`, `pick`, `ship`, `land`, `recap`, `draft`, `tune`. Each
  supports `--json` for adapter bridging and `--agent <label>` to populate
  the authorship footer.
- `@conductor-kit/core` exposes the domain-level modules that power the
  CLI: config loader, Jira/GitLab wrappers (`acli` + `glab` with prefill
  fallback), plan/status machinery (`plan-draft → plan-approved → shipped
  → landed`), authorship footer resolver, templates renderer, validation
  runner, UI-change detection, plan-scope parser, and tune classifier.
- `@conductor-kit/assets` carries neutral workflow templates, seeds, and
  references. All company-specific placeholders replaced with generic
  `<YOUR_PROJECT_KEY>` / `<YOUR_JIRA_BASE_URL>` forms.

Agent adapters (`agent-claude`, `agent-codex`, `agent-cursor`) and the
installer (`conductor-install`) ship as private packages on this release
and are copied into host repos via `npx conductor-install --agent <name>`.
