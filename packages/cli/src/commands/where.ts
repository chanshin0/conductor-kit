import { defineCommand } from 'citty';
import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { globalArgs } from '../global-args.js';
import { emitHandoff } from '../io.js';
import { git, work } from '@conductor-kit/core';

interface WhereSnapshot {
  cwd: string;
  conductor_initialized: boolean;
  git: {
    branch: string;
    clean: boolean;
  };
  active_issue: {
    key: string;
    status: string;
  } | null;
  other_issues: string[];
  next_action: string;
}

function inferIssueFromBranch(branch: string): string | null {
  const m = branch.match(/\/([A-Z][A-Z0-9]+-\d+)(?:-|$)/);
  return m?.[1] ?? null;
}

function nextAction(snap: Omit<WhereSnapshot, 'next_action'>): string {
  if (!snap.conductor_initialized) return 'conductor init';
  if (!snap.active_issue) return 'conductor pick <KEY>';
  switch (snap.active_issue.status) {
    case 'plan-draft':
      return `conductor pick ${snap.active_issue.key} --approve`;
    case 'plan-approved':
    case 'implementing':
      return 'conductor ship';
    case 'shipped':
      return `conductor land ${snap.active_issue.key}`;
    case 'landed':
      return `conductor recap ${snap.active_issue.key}`;
    default:
      return '(unknown state)';
  }
}

async function listWorkFiles(cwd: string): Promise<string[]> {
  const dir = join(cwd, '.work');
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir);
  return entries.filter((n) => n.endsWith('.md')).map((n) => n.replace(/\.md$/, ''));
}

export const whereCommand = defineCommand({
  meta: { description: 'Snapshot the current workflow state' },
  args: globalArgs,
  async run({ args }) {
    const cwd = (args.cwd as string | undefined) ?? process.cwd();

    let branch = '(not a git repo)';
    let clean = true;
    try {
      branch = (await git.currentBranch(cwd)) || '(detached)';
      clean = await git.isClean(cwd);
    } catch {
      // not a git repo — leave defaults
    }

    const initialized = existsSync(join(cwd, '.conductor', 'workflow.yml'));
    const keysInWork = await listWorkFiles(cwd);
    const inferredKey = inferIssueFromBranch(branch);

    let active: WhereSnapshot['active_issue'] = null;
    if (inferredKey && keysInWork.includes(inferredKey)) {
      const wf = await work.readWork(cwd, inferredKey);
      if (wf) active = { key: inferredKey, status: wf.status };
    }

    const partial: Omit<WhereSnapshot, 'next_action'> = {
      cwd,
      conductor_initialized: initialized,
      git: { branch, clean },
      active_issue: active,
      other_issues: keysInWork.filter((k) => k !== active?.key),
    };
    const snap: WhereSnapshot = { ...partial, next_action: nextAction(partial) };

    if (args.json) {
      emitHandoff({
        status: 'ok',
        phase: 'where/snapshot',
        data: snap as unknown as Record<string, unknown>,
      });
      return;
    }

    console.log(`conductor where  (${snap.cwd})`);
    console.log(
      `  .conductor/   : ${snap.conductor_initialized ? 'ok' : 'missing (run conductor init)'}`,
    );
    console.log(`  git branch    : ${snap.git.branch}${snap.git.clean ? '' : '  (dirty)'}`);
    if (snap.active_issue) {
      console.log(`  active issue  : ${snap.active_issue.key}  [${snap.active_issue.status}]`);
    } else {
      console.log('  active issue  : (none on this branch)');
    }
    if (snap.other_issues.length) {
      console.log(`  other .work/  : ${snap.other_issues.join(', ')}`);
    }
    console.log(`\nNext → ${snap.next_action}`);
  },
});
