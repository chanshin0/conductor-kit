# /conductor-ship

Validate → commit → push → MR → Jira ship comment. Jira stays at
`IN PROGRESS`; resolution happens in `conductor land`.

## Run

```bash
conductor ship $ARGUMENTS --json --agent "Cursor"
```

The CLI refuses unless `.work/{KEY}.md` status is `plan-approved` or
`implementing`. That is the plan gate — do not bypass it by manual edits.

## UI verification (Cursor has no browser tool)

When `git diff --stat` touches `src/views/**` / `src/components/**` and
`--skip-ui-check` was not passed, ask the user:

> UI 변경이 있다. 어떻게 검증할까?
> (a) 수동 확인 완료, GIF 경로 있음 → `--ui-verify <path>` 로 재실행
> (b) 사유와 함께 스킵 → `--skip-ui-check "<reason>"` 로 재실행
> (c) `@conductor-kit/ui-verify` (Playwright) 가 설치돼 있으면 CLI 가 자동
>     수행 — 그냥 진행

Echo the answer back on stdin if the CLI prompts.

## JSON stream

- `type: "question"` — ask the user, pipe answer back.
- `type: "signal"` with `step: "commit-message"` — show the CLI-drafted
  commit message for approval.
- `type: "question"` with `id: "deviation"` (plan-scope drift) — surface
  the file list, let the user choose `extend-plan / revert / ignore`.

## Handoff

**MR confirmed**:

```
출하 완료 — MR: {mr_url}
Jira: IN PROGRESS (머지 대기)
다음: 머지 후 → /conductor-land
```

**Prefill fallback**: open the prefill URL, press "Create", then
`/conductor-land <KEY>`.

## Guardrails

- No `git commit --amend`, no `--no-verify`. On hook failure, fix the
  cause and commit again.
- Do not write to `.work/{KEY}.md` while the CLI is running.
