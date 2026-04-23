import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { WorkStatus } from './types.js';

export interface WorkFile {
  issue_key: string;
  status: WorkStatus;
  raw: string;
}

/** `.work/{KEY}.md` path for a given issue. */
export function workPath(cwd: string, issueKey: string): string {
  return join(cwd, '.work', `${issueKey}.md`);
}

export function lockPath(cwd: string, issueKey: string): string {
  return join(cwd, '.work', `.lock-${issueKey}`);
}

export async function readWork(cwd: string, issueKey: string): Promise<WorkFile | null> {
  const p = workPath(cwd, issueKey);
  if (!existsSync(p)) return null;
  const raw = await readFile(p, 'utf8');
  return {
    issue_key: issueKey,
    status: parseStatus(raw),
    raw,
  };
}

export async function writeWork(cwd: string, issueKey: string, raw: string): Promise<void> {
  const dir = join(cwd, '.work');
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  await writeFile(workPath(cwd, issueKey), raw, 'utf8');
}

/** Parse the `status:` line from YAML-ish frontmatter or the "메타" section. */
export function parseStatus(raw: string): WorkStatus {
  const m = raw.match(/(?:^|\n)\s*(?:-\s*)?status\s*:\s*([a-z-]+)/i);
  if (!m) return 'plan-draft';
  const v = m[1]?.toLowerCase() ?? '';
  if (
    v === 'plan-draft' ||
    v === 'plan-approved' ||
    v === 'implementing' ||
    v === 'shipped' ||
    v === 'landed'
  ) {
    return v;
  }
  return 'plan-draft';
}

/** Gate helper for `conductor ship`: rejects unless the work file is plan-approved. */
export function assertShippable(file: WorkFile | null): void {
  if (!file) {
    throw new Error('No work file found. Run `conductor pick <KEY>` first.');
  }
  if (file.status !== 'plan-approved' && file.status !== 'implementing') {
    throw new Error(
      `Cannot ship: work file status is "${file.status}", expected "plan-approved" or "implementing". Approve the plan first (e.g. run \`conductor pick --approve\` or set status in .work/${file.issue_key}.md).`,
    );
  }
}
