# /conductor-tune

Route workflow feedback to the right file and apply edits after approval.

## Run

```bash
conductor tune $ARGUMENTS --json --agent "Cursor"
```

Modes:

- `/conductor-tune "<feedback>"` — one item.
- `/conductor-tune review` — walk unprocessed items in
  `.conductor/tune-log.md`.

## CLI output

```json
{"type": "classification",
 "category": "commands|templates|config|conventions",
 "targets": [".cursor/commands/conductor-ship.md", ...],
 "confidence": 0.7, "rationale": "..."}
```

## Adapter responsibilities

1. Read each target file.
2. Compose a concrete edit proposal (unified diff or before/after).
3. Present to the user with choices `apply / edit / skip`.
4. On `edit`, iterate until approved.
5. Apply the edits (Cursor's Edit tool).
6. Append a dated entry to `.conductor/tune-log.md`.
7. Pipe back: `{"id": "tune-apply", "answer": "applied", "files": [...]}`.

## Guardrails

- Never apply edits silently.
- Scope: host-repo files only (`.cursor/`, `.conductor/`, `CLAUDE.md`,
  `AGENTS.md` if present). Do not edit conductor-kit's own `packages/**`.
