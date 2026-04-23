# conductor:tune

Route workflow feedback to the right file (commands / templates / config /
conventions), then apply edits after user approval.

## Run

```bash
conductor tune $ARGUMENTS --json --agent "Codex"
```

Two modes:

- `conductor tune "<feedback>"` — classify one feedback item.
- `conductor tune review` — walk unprocessed entries in
  `.conductor/tune-log.md`.

## CLI output

```json
{"type": "classification", "category": "commands|templates|config|conventions",
 "targets": [".codex/prompts/conductor-ship.md", ...],
 "confidence": 0.7, "rationale": "..."}
```

## Adapter responsibilities

1. Read each candidate target file.
2. Compose a concrete unified-diff proposal against each file.
3. Present the proposal to the user with choices: `apply / edit / skip`.
4. On `edit`, iterate with the user until they approve.
5. Write the changes (Edit/Write).
6. Append a dated entry to `.conductor/tune-log.md`:

   ```
   ## 2026-04-23 — {category}
   - Feedback: "..."
   - Applied to: .codex/prompts/conductor-ship.md
   - Rationale: ...
   ```

7. Pipe back: `{"id": "tune-apply", "answer": "applied", "files": [...]}`.

## Guardrails

- Never apply edits silently. The diff must be reviewed first.
- Only edit host-repo files (`.codex/`, `.conductor/`, `CLAUDE.md`,
  `AGENTS.md`). Do not edit `node_modules/`, `packages/`, or anything
  inside conductor-kit itself.
