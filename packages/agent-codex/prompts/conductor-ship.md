# conductor:ship

Validate → commit → push → MR → Jira ship comment.

Jira stays at `IN PROGRESS`; resolution happens in `conductor land` only.

## Run

```bash
conductor ship $ARGUMENTS --json --agent "Codex"
```

The CLI refuses if `.work/{KEY}.md` status is not `plan-approved` or
`implementing`. That gate replaces Claude's `EnterPlanMode` — do not try to
flip the status manually.

## UI verification

Codex has no browser tool. Default ship behaviour when UI files changed:

- If the user has not decided, ask once:
  > UI 파일(`src/views/**`, `src/components/**`)에 변경이 있다. (a) 수동으로
  > 확인했고 GIF 첨부 → `--ui-verify <path>` / (b) 검증 스킵 + 사유
  > → `--skip-ui-check "<reason>"` / (c) Playwright (`@conductor-kit/ui-verify`)
  > 로 돌리기

- Echo the choice back as `{"id": "ui-strategy", "answer": "..."}`.

If a team uses `@conductor-kit/ui-verify`, the CLI invokes Playwright and
produces the GIF itself — no adapter work required.

## JSON stream handling

- `type: "question"` — ask the user, pipe answer back on stdin.
- `type: "hook"` with `id: "ui-verify"` (Claude-only; should not appear for
  Codex). If it does, reply `{"id": "ui-verify", "answer": "skip",
  "reason": "no browser tool"}`.
- `type: "signal"` with `step: "commit-message"` — CLI drafted a commit
  message from the template. Show it to the user for approval/edit.

## Handoff

**MR confirmed**:

```json
{"status": "ok", "phase": "ship/complete",
 "data": {"mr_url": "..."},
 "handoff": {"next_cmd": "conductor land"}}
```

Render:

```
출하 완료 — MR: {mr_url}
Jira: IN PROGRESS (머지 대기)
다음: 리뷰어 머지 후 → conductor land
```

**Prefill fallback** (glab unavailable, exit 10):

```json
{"status": "ok", "phase": "ship/mr-pending",
 "data": {"prefill_url": "...", "body_file": ".work/{KEY}-mr-body.md"}}
```

Tell the user to open the prefill URL and press "Create", then run
`conductor land <KEY>`.

## Guardrails

- No `git commit --amend`. If a pre-commit hook fails, fix the cause, stage
  again, create a new commit.
- No `--no-verify`.
- Do not write to `.work/{KEY}.md` while the CLI is running — let it finish
  and update the file, then layer your own notes on top.
