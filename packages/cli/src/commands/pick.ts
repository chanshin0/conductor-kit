import { defineCommand } from 'citty';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { globalArgs } from '../global-args.js';
import { emitHandoff } from '../io.js';
import {
  loadConfig,
  jira,
  git,
  work,
  renderPickWorkFile,
  pickCommitType,
} from '@conductor-kit/core';

type ConfigLike = {
  branch?: {
    prefix_map?: Record<string, string>;
    slug?: { max_words?: number; separator?: string };
  };
  jira?: { base_url?: string; transitions?: { start?: { to?: string } } };
};

export const pickCommand = defineCommand({
  meta: { description: 'Fetch Jira issue, create branch, transition to IN PROGRESS, draft plan' },
  args: {
    ...globalArgs,
    key: {
      type: 'positional',
      required: true,
      description: 'Jira issue key (e.g. ACME-42)',
    },
    'no-transition': {
      type: 'boolean',
      default: false,
      description: 'Skip the Jira transition',
    },
    approve: {
      type: 'boolean',
      description: 'Mark an existing plan-draft as plan-approved',
    },
  },
  async run({ args }) {
    const cwd = (args.cwd as string | undefined) ?? process.cwd();
    const issueKey = String(args.key);

    if (args.approve) {
      await approveExistingPlan(cwd, issueKey, Boolean(args.json));
      return;
    }

    const cfg = (await loadConfig({ cwd })) as ConfigLike;
    const issue = await jira.getIssue(issueKey);

    const commitType = pickCommitType(issue.type, cfg.branch?.prefix_map);
    const branch = git.buildBranchName({
      type: commitType,
      issue_key: issueKey,
      subject: issue.summary,
      max_words: cfg.branch?.slug?.max_words,
      separator: cfg.branch?.slug?.separator,
    });

    const clean = await git.isClean(cwd);
    if (!clean && !args.yes) {
      throw new Error('Working tree is dirty. Commit/stash first, or pass --yes.');
    }

    const current = await git.currentBranch(cwd);
    if (current !== branch) {
      await git.checkoutBranch(branch, cwd);
    }

    const targetTransition = cfg.jira?.transitions?.start?.to;
    if (!args['no-transition'] && targetTransition) {
      try {
        await jira.transition(issueKey, targetTransition);
      } catch (err) {
        process.stderr.write(`[warn] Jira transition skipped: ${(err as Error).message}\n`);
      }
    }

    const jiraBaseUrl = cfg.jira?.base_url || '<YOUR_JIRA_BASE_URL>';
    const workContent = renderPickWorkFile({ issue, branch, jiraBaseUrl });
    await mkdir(join(cwd, '.work'), { recursive: true });
    await writeFile(work.workPath(cwd, issueKey), workContent, 'utf8');

    if (args.json) {
      emitHandoff({
        status: 'deferred-to-agent',
        phase: 'pick/plan-draft',
        data: {
          issue_key: issueKey,
          branch,
          work_file: work.workPath(cwd, issueKey),
          summary: issue.summary,
          jira_status: issue.status,
          transitioned_to: args['no-transition'] ? null : (targetTransition ?? null),
        },
        handoff: {
          next_cmd: `conductor pick ${issueKey} --approve`,
          message: 'Fill in the plan, then run pick --approve before ship.',
        },
      });
      return;
    }

    console.log(`pick ${issueKey} → ${branch}`);
    console.log(`  issue type : ${issue.type}`);
    console.log(`  summary    : ${issue.summary}`);
    console.log(
      `  jira       : ${issue.status}${args['no-transition'] ? '' : ` → ${targetTransition ?? '(no transition)'}`}`,
    );
    console.log(`  work file  : .work/${issueKey}.md (status: plan-draft)`);
    console.log('\nNext:');
    console.log('  1. Fill in the "플랜" section of the work file.');
    console.log(`  2. \`conductor pick ${issueKey} --approve\` to unlock ship.`);
    console.log('  3. Implement, then `conductor ship`.');
  },
});

async function approveExistingPlan(cwd: string, issueKey: string, json: boolean): Promise<void> {
  const existing = await work.readWork(cwd, issueKey);
  if (!existing) {
    throw new Error(`No work file for ${issueKey}. Run \`conductor pick ${issueKey}\` first.`);
  }
  if (existing.status === 'plan-approved' || existing.status === 'implementing') {
    if (json) {
      emitHandoff({
        status: 'ok',
        phase: 'pick/approve',
        data: { issue_key: issueKey, status: existing.status, noop: true },
      });
    } else {
      console.log(`.work/${issueKey}.md already at status: ${existing.status} (no-op)`);
    }
    return;
  }
  if (existing.status !== 'plan-draft') {
    throw new Error(`Cannot approve: status is "${existing.status}", expected "plan-draft".`);
  }
  const current = await readFile(work.workPath(cwd, issueKey), 'utf8');
  const next = current.replace(/status:\s*plan-draft/i, 'status: plan-approved');
  if (next === current) {
    throw new Error('Unable to find a plan-draft status line to promote.');
  }
  await writeFile(work.workPath(cwd, issueKey), next, 'utf8');

  if (json) {
    emitHandoff({
      status: 'ok',
      phase: 'pick/approve',
      data: { issue_key: issueKey, status: 'plan-approved' },
      handoff: { next_cmd: 'conductor ship', message: 'Plan approved — ship is unlocked.' },
    });
  } else {
    console.log(`approved: .work/${issueKey}.md (plan-draft → plan-approved)`);
    console.log('Ship is now unlocked: `conductor ship`');
  }
}
