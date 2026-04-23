import { execa } from 'execa';

export interface BranchNameInput {
  type: string;
  issue_key: string;
  subject: string;
  max_words?: number;
  separator?: string;
}

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
  const { stdout } = await execa('git', ['branch', '--show-current'], { cwd });
  return stdout.trim();
}

export async function isClean(cwd = process.cwd()): Promise<boolean> {
  const { stdout } = await execa('git', ['status', '--porcelain'], { cwd });
  return stdout.trim().length === 0;
}
