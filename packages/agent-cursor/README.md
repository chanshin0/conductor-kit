# @conductor-kit/agent-cursor

[Cursor](https://www.cursor.com/) adapter for conductor-kit.

Ships two kinds of artifacts into a host repo:

- `.cursor/rules/conductor-{workflow,ui,conventions}.mdc` — three rule files
  that wire the Agent into the conductor playbook:
  - `conductor-workflow.mdc` — **Always** (`alwaysApply: true`), 5–10 line
    principles.
  - `conductor-ui.mdc` — **Auto-Attached**, globs `src/views/**`,
    `src/components/**`. Triggers UI-specific guidance when those files are
    in context.
  - `conductor-conventions.mdc` — **Agent Requested** (Cursor loads it when
    it judges the task relevant).
- `.cursor/commands/conductor-*.md` × 9 — slash commands. Every command
  body delegates to the `conductor` CLI with `--agent "Cursor"`.

## Install

```
npx @conductor-kit/installer --agent cursor
```

## Design

Cursor has no EnterPlanMode equivalent. The plan-approval gate is enforced
by the CLI's `.work/{KEY}.md` status machine plus the Always-rule, which
tells the Agent to halt before source edits until `conductor pick <KEY>
--approve` has been run.

Every command hardcodes `--agent "Cursor"`. Override per model if desired
(e.g. `Cursor / Claude Sonnet 4.6`).

UI verification: Cursor has no browser tool. Default behaviour is
`--skip-ui-check <reason>` or `@conductor-kit/ui-verify` (Playwright).
