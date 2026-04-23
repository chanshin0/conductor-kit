# /conductor-recap

Post-merge result comment on Jira (+ optional Confluence draft).

## Run

```bash
conductor recap $ARGUMENTS --json --agent "Cursor"
```

Flags: `--confluence` to also produce a Confluence page draft (needs
`confluence.*` configured in `.conductor/workflow.yml`).

## Adapter responsibilities

On `{"type": "question", "id": "recap-summary", "default": "..."}`:

1. Refine the default with the plan's 목표 + merged diff summary.
2. Present to the user for edit / approve.
3. Echo back `{"id": "recap-summary", "answer": "<final text>"}`.

## Handoff

```json
{"status": "ok", "phase": "recap/complete",
 "data": {"jira_commented": true, "confluence_url": null}}
```

## Guardrails

- No `--confluence` without explicit user request.
- Recap is append-only. Do not rewrite prior comments.
