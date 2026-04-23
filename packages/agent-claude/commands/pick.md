---
description: Jira 이슈 가져오기 — 컨텍스트 수집 → 브랜치 → 전환 → 플랜 초안 → Plan Mode
argument-hint: "<ISSUE-KEY>  (e.g. ACME-42)"
---

# /conductor:pick

**Metaphor**: pick up the next ticket from the backlog; sign the flight plan
before takeoff.

Claude-specific behaviour: this is the **only** adapter command that wraps the
plan draft with `EnterPlanMode` so the agent is structurally blocked from
editing code before approval. Other agent adapters rely on the CLI's
`plan-draft → plan-approved` status gate alone.

## Phase 0 — Delegate to CLI

```bash
conductor pick $ARGUMENTS --json --agent "Claude Code"
```

The CLI handles: Jira fetch via `acli`, branch naming from `PREFIX_MAP`,
`git checkout -b`, Jira `TO DO → IN PROGRESS` transition, and writing
`.work/{KEY}.md` with the raw issue context (title, description, acceptance,
candidate files from `git log --grep`).

Expected handoff:

```json
{
  "status": "deferred-to-agent",
  "phase": "pick/plan-draft",
  "data": {
    "issue_key": "ACME-42",
    "branch": "feat/ACME-42-add-foo",
    "work_file": ".work/ACME-42.md",
    "summary": "...",
    "jira_status": "In Progress"
  },
  "handoff": {
    "next_cmd": "conductor pick ACME-42 --approve",
    "message": "Fill in the plan, then run pick --approve before ship."
  }
}
```

If any `type: "question"` line appears during the CLI run, bridge it via
`AskUserQuestion` and echo the choice back to stdin.

## Phase 1 — Repo context scan (parallel)

In a **single message**, fan out read-only tools to build the mental model:

- Read `package.json`, `tsconfig.json`, `vite.config.*` / `webpack.config.*`.
- Glob root `src/**` for the domain layout.
- Read `CLAUDE.md` (project root) if present.
- Read `.conductor/CONVENTIONS.md`.
- Grep for the issue's title keywords to surface candidate files.

Use these to fill the plan; never re-scan in later phases.

## Phase 2 — Feature briefing

Before drafting the plan, read 1–2 entry-point files (view / composable /
modal) that match the issue description and present a 3–5 paragraph briefing
to the user:

1. Feature name / screen path
2. User-facing behaviour
3. Code structure (entry file → composable → query → axios, with paths)
4. Observed symptom or requested change (intersection of Jira and code)

Record this under `## 기능 개요` in `.work/{KEY}.md`.

## Phase 3 — Plan draft + Plan Mode

### 3-1. Render the plan

Use `packages/assets/workflow/templates/plan-template.md` (resolved via
`conductor template render plan --out .work/{KEY}-plan.md` if available, else
read from the installed `.conductor/.cache/templates/plan-template.md`).

Fill every required section. **영향 범위 / 테스트 전략 / 위험 / 그레이존**
sections must never be blank — write "없음" explicitly if there are no items.

### 3-2. Surface grey-area questions

For each ambiguity the agent cannot resolve from the code alone, call
`AskUserQuestion` with a single, concrete question. Log each Q/A under the
"그레이존 답변 로그" section. Do **not** invent answers.

### 3-3. Write back

Paste the final draft into `.work/{KEY}.md` under `## 플랜`. Keep status at
`plan-draft`.

### 3-4. EnterPlanMode

Call the built-in `EnterPlanMode` tool with the plan as the proposal. This
structurally blocks Edit/Write. The user reviews → optionally requests edits
("{섹션}을 {이유}로 다시") → approves with `ExitPlanMode`.

On `ExitPlanMode`, immediately run:

```bash
conductor pick <KEY> --approve --agent "Claude Code"
```

This flips `.work/{KEY}.md` from `plan-draft` to `plan-approved` and unlocks
`/conductor:ship`.

## Handoff

After the CLI returns (Phase 0) and before EnterPlanMode:

```
플랜 초안이다. 검토/수정 후 승인해줘.
- 브랜치: {branch}
- Jira: {jira_status} (→ IN PROGRESS)
- 작업 노트: {work_file}
```

After `ExitPlanMode` and `--approve`:

```
┌─────────────────────────────────────────┐
│ 플랜 승인 완료                            │
│ 브랜치: {branch}                          │
│ Jira: IN PROGRESS                       │
│ 다음: 구현 후 → /conductor:ship       │
└─────────────────────────────────────────┘
```

## Guardrails

- No Edit/Write before `ExitPlanMode`. EnterPlanMode enforces this; do not
  work around it.
- If the CLI exits non-zero at Phase 0 (e.g. `acli` missing, dirty worktree),
  stop and surface the CLI's stderr verbatim. Do not attempt to continue.
- Never invent Jira content. If `acli` cannot fetch the issue, stop.
