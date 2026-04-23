import { execa } from 'execa';

export interface BranchNameInput {
  type: string;
  issue_key: string;
  subject: string;
  max_words?: number;
  separator?: string;
}

/**
 * Default execa options for every `git` call in this module.
 *
 * `stdin: 'ignore'` is the important bit: conductor ships a JSON protocol
 * over its own stdin, and some git subcommands (notably `git commit` under
 * hooks that run pagers, or `git rev-parse` in corner cases) can end up
 * draining the parent process's stdin if it's inherited. Ignoring stdin for
 * every git spawn keeps the parent's stdin intact for the promptOne /
 * readJsonLine flow.
 */
const GIT_EXECA = { stdin: 'ignore' } as const;

/** Lower-case, strip non-[a-z0-9], keep hyphens. */
export function slugify(subject: string, maxWords = 5, separator = '-'): string {
  return subject
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, maxWords)
    .join(separator);
}

export function buildBranchName(input: BranchNameInput): string {
  const slug = slugify(input.subject, input.max_words, input.separator);
  return `${input.type}/${input.issue_key}-${slug}`;
}

export async function currentBranch(cwd = process.cwd()): Promise<string> {
  const { stdout } = await execa('git', ['branch', '--show-current'], { cwd, ...GIT_EXECA });
  return stdout.trim();
}

export async function isClean(cwd = process.cwd()): Promise<boolean> {
  const { stdout } = await execa('git', ['status', '--porcelain'], { cwd, ...GIT_EXECA });
  return stdout.trim().length === 0;
}

export async function checkoutBranch(
  branch: string,
  cwd = process.cwd(),
  { create = true }: { create?: boolean } = {},
): Promise<void> {
  const args = create ? ['checkout', '-b', branch] : ['checkout', branch];
  await execa('git', args, { cwd, ...GIT_EXECA });
}

export async function deleteBranch(
  branch: string,
  cwd = process.cwd(),
  { force = false }: { force?: boolean } = {},
): Promise<void> {
  await execa('git', ['branch', force ? '-D' : '-d', branch], { cwd, ...GIT_EXECA });
}

export async function fetchRemote(remote = 'origin', cwd = process.cwd()): Promise<void> {
  await execa('git', ['fetch', remote], { cwd, ...GIT_EXECA });
}

export async function pullFastForward(cwd = process.cwd()): Promise<void> {
  await execa('git', ['pull', '--ff-only'], { cwd, ...GIT_EXECA });
}

export async function addAll(cwd = process.cwd()): Promise<void> {
  await execa('git', ['add', '-A'], { cwd, ...GIT_EXECA });
}

export async function commit(message: string, cwd = process.cwd()): Promise<void> {
  await execa('git', ['commit', '-m', message], { cwd, ...GIT_EXECA });
}

export async function pushHead(
  remote = 'origin',
  cwd = process.cwd(),
): Promise<void> {
  await execa('git', ['push', '-u', remote, 'HEAD'], { cwd, ...GIT_EXECA });
}

/** `git diff --name-only <ref>...HEAD` — returns a list of changed files. */
export async function diffNames(ref: string, cwd = process.cwd()): Promise<string[]> {
  const { stdout } = await execa('git', ['diff', '--name-only', `${ref}...HEAD`], {
    cwd,
    ...GIT_EXECA,
  });
  return stdout.split('\n').map((l) => l.trim()).filter(Boolean);
}

/** Short diff stat (e.g. for commit body / MR body). */
export async function diffStat(ref: string, cwd = process.cwd()): Promise<string> {
  const { stdout } = await execa('git', ['diff', '--stat', `${ref}...HEAD`], {
    cwd,
    ...GIT_EXECA,
  });
  return stdout;
}

/** Return `true` if `mergedBranch` is reachable from `into` (i.e. already merged). */
export async function isMerged(
  mergedBranch: string,
  into: string,
  cwd = process.cwd(),
): Promise<boolean> {
  try {
    const { stdout } = await execa('git', ['branch', '--merged', into], {
      cwd,
      ...GIT_EXECA,
    });
    return stdout
      .split('\n')
      .map((l) => l.replace(/^\*?\s+/, '').trim())
      .includes(mergedBranch);
  } catch {
    return false;
  }
}
