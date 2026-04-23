import { execa, ExecaError } from 'execa';
import { readFile } from 'node:fs/promises';

/** Exit-code contract mirrored from the legacy `create-mr.sh` script. */
export const MR_EXIT = {
  CREATED: 0,
  PREFILL_FALLBACK: 10,
  FATAL: 20,
} as const;

export type MrOutcome =
  | { kind: 'created'; url: string }
  | { kind: 'prefill'; url: string; body_truncated: boolean };

export class GitLabFatalError extends Error {
  code = MR_EXIT.FATAL;
  constructor(message: string) {
    super(message);
    this.name = 'GitLabFatalError';
  }
}

/**
 * Parse the remote URL (`git@host:group/project.git` or
 * `https://host/group/project.git`) into `{ baseUrl, projectPath }`.
 *
 * Returns `null` on unrecognised formats so callers can surface a
 * user-facing fatal error instead of throwing from a pure parser.
 */
export function parseGitRemote(
  remote: string,
): { baseUrl: string; projectPath: string } | null {
  const trimmed = remote.trim();

  const sshMatch = trimmed.match(/^git@([^:]+):(.+?)(?:\.git)?$/);
  if (sshMatch) {
    return { baseUrl: `https://${sshMatch[1]!}`, projectPath: sshMatch[2]! };
  }

  const httpMatch = trimmed.match(/^(https?:\/\/[^/]+)\/(.+?)(?:\.git)?$/);
  if (httpMatch) {
    return { baseUrl: httpMatch[1]!, projectPath: httpMatch[2]! };
  }

  return null;
}

/** URL-encode a prefill MR creation URL. */
export function buildPrefillUrl(input: {
  baseUrl: string;
  projectPath: string;
  sourceBranch: string;
  targetBranch: string;
  title: string;
  description: string;
}): string {
  const params = new URLSearchParams({
    'merge_request[source_branch]': input.sourceBranch,
    'merge_request[target_branch]': input.targetBranch,
    'merge_request[title]': input.title,
    'merge_request[description]': input.description,
  });
  const base = input.baseUrl.replace(/\/+$/, '');
  const proj = input.projectPath.replace(/^\/+|\/+$/g, '');
  return `${base}/${proj}/-/merge_requests/new?${params.toString()}`;
}

/** Safety net for prefill URLs — bodies past this length get replaced by a pointer. */
const PREFILL_BODY_LIMIT = 8000;

export interface CreateMrInput {
  cwd: string;
  sourceBranch: string;
  targetBranch: string;
  title: string;
  /** Path to an MR body file. Contents are read lazily. */
  bodyFile: string;
  /** Optional override; falls back to parsing `origin` remote. */
  gitlabBaseUrl?: string;
  /** Optional override; falls back to parsing `origin` remote. */
  gitlabProjectPath?: string;
}

/**
 * Create a MR. Tries `glab mr create` first, falls back to a GitLab prefill
 * URL when glab is unavailable or exits non-zero.
 *
 * Returns `MrOutcome` — never throws for "MR not created, fallback used";
 * that case returns `{ kind: 'prefill', ... }`. Throws `GitLabFatalError`
 * only for truly fatal issues (missing body file, unparseable remote).
 */
export async function createMr(input: CreateMrInput): Promise<MrOutcome> {
  const body = await readFile(input.bodyFile, 'utf8');

  // --- 1) glab attempt ---
  const glabArgs = [
    'mr',
    'create',
    '--source-branch',
    input.sourceBranch,
    '--target-branch',
    input.targetBranch,
    '--title',
    input.title,
    '--description-file',
    input.bodyFile,
    '--yes',
  ];
  if (input.gitlabProjectPath) {
    glabArgs.unshift('--repo', input.gitlabProjectPath);
  }

  try {
    const { stdout } = await execa('glab', glabArgs, { cwd: input.cwd, reject: true });
    const urlMatch = stdout.match(/https?:\/\/[^\s]+\/merge_requests\/\d+/);
    if (urlMatch) {
      return { kind: 'created', url: urlMatch[0]! };
    }
    // glab succeeded without a recognisable URL — fall through to prefill.
  } catch (err) {
    const e = err as ExecaError;
    if ((e as { code?: string }).code === 'ENOENT') {
      // glab not installed — expected fallback path.
    } else {
      // glab present but failed (auth / permissions / network) — still fall back,
      // but leave a breadcrumb on stderr so the operator can diagnose.
      process.stderr.write(`[warn] glab mr create failed: ${e.shortMessage}\n`);
    }
  }

  // --- 2) prefill fallback ---
  let baseUrl = input.gitlabBaseUrl;
  let projectPath = input.gitlabProjectPath;
  if (!baseUrl || !projectPath) {
    const remote = await readOriginRemote(input.cwd);
    if (!remote) {
      throw new GitLabFatalError(
        `no git remote "origin" — cannot build fallback MR URL. ` +
          `Set gitlab.base_url and gitlab.project_path in .conductor/workflow.yml.`,
      );
    }
    const parsed = parseGitRemote(remote);
    if (!parsed) {
      throw new GitLabFatalError(`failed to parse git remote: ${remote}`);
    }
    baseUrl ??= parsed.baseUrl;
    projectPath ??= parsed.projectPath;
  }

  const truncated = body.length > PREFILL_BODY_LIMIT;
  const description = truncated
    ? `본문이 URL 길이 한계를 초과하여 포함 불가. \`${input.bodyFile}\` 내용을 복사해 description 에 붙여넣으세요.`
    : body;

  const url = buildPrefillUrl({
    baseUrl,
    projectPath,
    sourceBranch: input.sourceBranch,
    targetBranch: input.targetBranch,
    title: input.title,
    description,
  });

  return { kind: 'prefill', url, body_truncated: truncated };
}

async function readOriginRemote(cwd: string): Promise<string | null> {
  try {
    const { stdout } = await execa('git', ['remote', 'get-url', 'origin'], { cwd });
    return stdout.trim();
  } catch {
    return null;
  }
}
