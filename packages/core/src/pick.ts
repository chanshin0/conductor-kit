import type { JiraIssue } from './jira.js';

export interface RenderPickWorkInput {
  issue: JiraIssue;
  branch: string;
  jiraBaseUrl: string;
  /** ISO timestamp. Injected for test determinism. */
  now?: string;
}

/** Minimal `.work/{KEY}.md` body for `conductor pick`. Richer templating arrives in Phase 2. */
export function renderPickWorkFile(input: RenderPickWorkInput): string {
  const { issue, branch, jiraBaseUrl } = input;
  const now = input.now ?? new Date().toISOString();
  return `# ${issue.key} — ${issue.summary}

## 메타

- status: plan-draft
- branch: ${branch}
- issue_type: ${issue.type}
- jira_status: ${issue.status}
- created: ${now}

## Jira

- Link: ${jiraBaseUrl}/browse/${issue.key}
- Type: ${issue.type}
- Priority: ${issue.priority ?? '-'}
- Reporter: ${issue.reporter ?? '-'}
- Assignee: ${issue.assignee ?? '-'}
- Summary: ${issue.summary}

## Description

${issue.description ?? '(empty)'}

## 플랜 (by conductor pick)

<!-- TODO: fill in. Approve via \`conductor pick ${issue.key} --approve\` when ready. -->

## 실행 로그

## 결정 메모

## 검증 결과 (by conductor ship)

## 머지 (by conductor land)

## 회고 (by conductor recap)
`;
}

/** Pick the commit/branch `type` for a given Jira issue type, falling back to `feat`. */
export function pickCommitType(
  issueType: string,
  prefixMap: Record<string, string> | undefined,
): string {
  if (!prefixMap) return 'feat';
  return prefixMap[issueType] ?? 'feat';
}
