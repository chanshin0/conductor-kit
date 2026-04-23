import { execa, ExecaError } from 'execa';

/** Exit code conventions this wrapper exposes to callers. */
export const JIRA_EXIT = {
  OK: 0,
  ACLI_MISSING: 10,
  API_FAILURE: 20,
} as const;

export class AcliMissingError extends Error {
  code = JIRA_EXIT.ACLI_MISSING;
  constructor() {
    super('acli CLI not found on PATH. Install from https://developer.atlassian.com/cloud/acli/');
    this.name = 'AcliMissingError';
  }
}

export class JiraApiError extends Error {
  code = JIRA_EXIT.API_FAILURE;
  stderr: string;
  constructor(message: string, stderr: string) {
    super(message);
    this.name = 'JiraApiError';
    this.stderr = stderr;
  }
}

export interface JiraIssue {
  key: string;
  type: string;
  summary: string;
  status: string;
  priority?: string;
  assignee?: string;
  reporter?: string;
  description?: string;
  /** Raw acli response (other fields the caller might need). */
  raw: Record<string, unknown>;
}

/** Run `acli jira ...` and return stdout. Narrow known failure modes. */
async function runAcli(args: string[]): Promise<string> {
  try {
    const { stdout } = await execa('acli', args, { reject: true });
    return stdout;
  } catch (err) {
    const e = err as ExecaError;
    if ((e as { code?: string }).code === 'ENOENT') throw new AcliMissingError();
    throw new JiraApiError(e.shortMessage || 'acli call failed', e.stderr?.toString() ?? '');
  }
}

/** Fetch a Jira work item. `acli jira workitem view {KEY} --json`. */
export async function getIssue(issueKey: string): Promise<JiraIssue> {
  const stdout = await runAcli(['jira', 'workitem', 'view', issueKey, '--json']);
  const parsed = JSON.parse(stdout) as Record<string, unknown>;
  return normalizeIssue(parsed, issueKey);
}

/** Apply a transition (e.g. "In Progress", "Resolve"). */
export async function transition(issueKey: string, transitionName: string): Promise<void> {
  await runAcli(['jira', 'workitem', 'transition', issueKey, '--status', transitionName]);
}

/** Post a comment. Accepts inline body or `@path/to/file`. */
export async function comment(issueKey: string, bodyOrPath: string): Promise<void> {
  await runAcli(['jira', 'workitem', 'comment', 'create', issueKey, '--body', bodyOrPath]);
}

export interface JiraSearchHit {
  key: string;
  summary: string;
  status: string;
}

/** `acli jira workitem search --jql '<jql>' --json` — returns a lean hit list. */
export async function search(
  jql: string,
  opts: { maxResults?: number } = {},
): Promise<JiraSearchHit[]> {
  const stdout = await runAcli(['jira', 'workitem', 'search', '--jql', jql, '--json']);
  const parsed = JSON.parse(stdout) as {
    issues?: Array<{
      key?: string;
      fields?: { summary?: string; status?: { name?: string } };
    }>;
  };
  const max = opts.maxResults ?? 20;
  return (parsed.issues ?? [])
    .slice(0, max)
    .map((i) => ({
      key: i.key ?? '',
      summary: i.fields?.summary ?? '',
      status: i.fields?.status?.name ?? '',
    }))
    .filter((h) => h.key);
}

/** Map acli's JSON shape onto our lean JiraIssue struct. */
export function normalizeIssue(raw: Record<string, unknown>, fallbackKey: string): JiraIssue {
  const fields = (raw.fields as Record<string, unknown> | undefined) ?? {};
  const issueTypeRaw = fields.issuetype as { name?: string } | undefined;
  const statusRaw = fields.status as { name?: string } | undefined;
  const priorityRaw = fields.priority as { name?: string } | undefined;
  const assigneeRaw = fields.assignee as { displayName?: string } | undefined;
  const reporterRaw = fields.reporter as { displayName?: string } | undefined;

  return {
    key: (raw.key as string) ?? fallbackKey,
    type: issueTypeRaw?.name ?? 'Task',
    summary: (fields.summary as string) ?? '',
    status: statusRaw?.name ?? 'Unknown',
    priority: priorityRaw?.name,
    assignee: assigneeRaw?.displayName,
    reporter: reporterRaw?.displayName,
    description: fields.description as string | undefined,
    raw,
  };
}
