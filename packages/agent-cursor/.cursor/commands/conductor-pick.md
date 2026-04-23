# /conductor-pick

Pick up a Jira issue and draft a plan. **No source edits** until
`conductor pick <KEY> --approve` has been run.

## Step 1 — Delegate

```bash
conductor pick $ARGUMENTS --json --agent "Cursor"
```

The CLI handles Jira fetch (`acli`), branch naming, `git checkout -b`,
`TO DO → IN PROGRESS` transition, and writes raw issue context into
`.work/{KEY}.md`.

Expect `{"status": "deferred-to-agent", "phase": "pick/plan-draft", ...}`.
Any `type: "question"` line: ask the user, echo the answer back on stdin.

## Step 2 — Repo scan (read-only)

In parallel, use Cursor's file tools to read:

- `package.json`, `tsconfig.json`, Vite/Webpack config
- `CLAUDE.md` (root) if present
- `.conductor/CONVENTIONS.md` (Agent Requested rule already loads it
  automatically when relevant — you do not need to re-read unless the rule
  was skipped)
- `src/` top-level for layout

Grep for issue title keywords to find candidate files.

## Step 3 — Feature briefing

Read 1–2 entry-point files, then present a 3–5 paragraph briefing before
the plan:

1. Feature name / screen path
2. User-facing behaviour
3. Code structure (entry → composable → query → axios paths)
4. Observed symptom or requested change

Append under `## 기능 개요` in `.work/{KEY}.md`.

## Step 4 — Draft the plan

Template: `.conductor/.cache/templates/plan-template.md` (copied by
installer) or `conductor template render plan --out .work/{KEY}-plan.md`.

Required sections never blank: **영향 범위 / 테스트 전략 / 위험 / 그레이존**
(write "없음 — <reason>" if empty).

For every ambiguity, ask the user exactly one question. Log Q/A under
"그레이존 답변 로그". Do not invent answers.

Paste the final draft into `.work/{KEY}.md` under `## 플랜`.

## Step 5 — Wait for approval

Tell the user:

> 플랜 초안 준비됐다. 검토 후 승인해 주면 `conductor pick {KEY} --approve` 를 돌린다.

On approval:

```bash
conductor pick <KEY> --approve --agent "Cursor"
```

This flips status to `plan-approved` and unlocks `conductor ship`.

## Guardrails

- No Edit/Write on source files before `--approve`. Cursor does not block
  tool calls — this is a convention, honour it.
- If the CLI fails at Step 1, surface stderr and stop.
