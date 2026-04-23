# @conductor-kit/agent-codex

[Codex CLI](https://github.com/openai/codex) adapter for conductor-kit.

Ships two artifacts into a host repo:

- `AGENTS.md` section (merged between `<!-- conductor-kit begin -->` and
  `<!-- conductor-kit end -->` markers — host-authored content is preserved).
- `.codex/prompts/conductor-*.md` × 9 — prompt files invoked from Codex as
  `> conductor pick ACME-42` style slash shortcuts (exact syntax per Codex
  version; prompts are standalone and can also be copy-pasted into Codex
  chat).

## Install

```
npx @conductor-kit/installer --agent codex
```

## Design

Codex has no `EnterPlanMode` equivalent. The plan-approval gate relies
entirely on the CLI's `.work/{KEY}.md` status machine (`plan-draft →
plan-approved`). Prompts remind the model to **not Edit** before the user
says "approved" and `conductor pick <KEY> --approve` has been run.

Every prompt hardcodes `--agent "Codex"` so the authorship footer shows
`Codex` regardless of host-repo default. Override in the prompt file if
you want model-specific attribution (e.g. `Codex GPT-5`).

UI verification: Codex does not have a browser tool. Default behaviour is
`--skip-ui-check <reason>`. Teams that need automated UI verification
should install `@conductor-kit/ui-verify` (Playwright, optional) and wire
it via the CLI's `--ui-verify <gif>` flag.
