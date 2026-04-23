# /conductor-land

After the MR is merged, transition Jira to RESOLVE and clean up the local
branch.

## Run

```bash
conductor land $ARGUMENTS --json --agent "Cursor"
```

No argument: the CLI infers the Jira key from the current branch. Pass the
key explicitly only when you are on a different branch.

## Typical question

```json
{"type": "question", "id": "not-merged",
 "prompt": "Branch not detected as merged into origin/main.",
 "choices": ["force", "abort"]}
```

Answer `force` only when the user visually confirms the merge (e.g.
squash-merge created a new SHA). Otherwise `abort`.

## Handoff

```
착륙 완료: {KEY}
머지: → {target_branch}
Jira: {transitioned ? RESOLVE : "(수동 전환 필요)"}
로컬 브랜치: {deleted ? 삭제 : 유지}
다음: /conductor-recap {KEY}
```

## Guardrails

- The CLI owns `git push --force`, `git reset --hard`, and branch deletes.
  Do not run them directly.
- If `jira_transitioned: false`, relay the warning. The user may need to
  re-auth `acli`.
