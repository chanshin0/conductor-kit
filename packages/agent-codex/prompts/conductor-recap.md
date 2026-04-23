# conductor:recap

Post-merge result comment on Jira (+ optional Confluence draft).

## Run

```bash
conductor recap $ARGUMENTS --json --agent "Codex"
```

Flags: `--confluence` to also render a Confluence page draft (requires
`confluence.space_key` / credentials in `.conductor/workflow.yml`).

## Adapter responsibilities

If the CLI asks:

```json
{"type": "question", "id": "recap-summary",
 "prompt": "3–5줄 요약 초안:", "default": "..."}
```

Take the suggested default, refine it with the plan's 목표 + the merged diff
summary, present it to the user, and pipe back the approved text:

```
{"id": "recap-summary", "answer": "최종 3~5줄 요약..."}
```

## Handoff

```json
{"status": "ok", "phase": "recap/complete",
 "data": {"jira_commented": true, "confluence_url": null}}
```

## Guardrails

- Do not post Confluence without an explicit `--confluence` from the user.
- Recap is append-only. Never edit previously-posted comments via recap.
