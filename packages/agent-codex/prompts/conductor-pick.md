# conductor:pick

Pick up a Jira issue and draft a plan. **No source-file edits** until the
user approves the plan and `conductor pick <KEY> --approve` has been run.

## Step 1 — Delegate

```bash
conductor pick $ARGUMENTS --json --agent "Codex"
```

The CLI handles: Jira fetch (`acli`), branch naming from `PREFIX_MAP`,
`git checkout -b`, Jira `TO DO → IN PROGRESS`, and writing
`.work/{KEY}.md` with raw issue context (title / description / candidate
files from `git log --grep`).

Expect:

```json
{"status": "deferred-to-agent", "phase": "pick/plan-draft",
 "data": {"issue_key": "...", "branch": "...", "work_file": ".work/...md",
          "summary": "...", "jira_status": "..."},
 "handoff": {"next_cmd": "conductor pick <KEY> --approve", ...}}
```

Stream any `type: "question"` lines back to the user and echo the response
onto the CLI's stdin.

## Step 2 — Repo scan (read-only)

In parallel, read the tree to calibrate your plan:

- `package.json`, `tsconfig.json`, Vite/Webpack config
- `CLAUDE.md` (root) if present
- `.conductor/CONVENTIONS.md`
- `ls src/` for layer layout

Grep for the issue title keywords to surface candidate files.

## Step 3 — Feature briefing

Read 1–2 entry-point files (view / composable / modal) matching the issue.
Present a 3–5 paragraph briefing to the user **before** drafting the plan:

1. Feature name / screen path
2. User-facing behaviour
3. Code structure (entry → composable → query → axios, with file paths)
4. Observed symptom or requested change

Append this under `## 기능 개요` in `.work/{KEY}.md`.

## Step 4 — Draft the plan

Use `.conductor/.cache/templates/plan-template.md` (copied by installer) or
run `conductor template render plan --out .work/{KEY}-plan.md` to fetch the
template from assets.

Fill every section. **영향 범위 / 테스트 전략 / 위험 / 그레이존** must not
be blank — write "없음" with a one-line reason if there are no items.

For each ambiguity, ask the user exactly one concrete question. Record Q/A
under a "그레이존 답변 로그" section. Do not invent answers.

Paste the final draft into `.work/{KEY}.md` under `## 플랜`.

## Step 5 — Wait for approval

Tell the user:

> 플랜 초안 준비됐다. 검토 후 "승인" 이라고 말해주면 `conductor pick {KEY} --approve` 를 돌린다.

When the user confirms, run:

```bash
conductor pick <KEY> --approve --agent "Codex"
```

This flips status to `plan-approved` and unlocks `conductor ship`.

## Guardrails

- **No Edit/Write on source files** before `--approve`. The gate is
  convention here (no EnterPlanMode in Codex) — honour it strictly.
- If the CLI fails at Step 1, surface its stderr and stop. Do not retry
  silently, do not invent Jira content.
- If the branch already exists, the CLI switches instead of recreating — do
  not try to rename or force.
