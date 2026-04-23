import { defineCommand } from 'citty';
import { writeFile } from 'node:fs/promises';
import { globalArgs } from '../global-args.js';
import { emitHandoff } from '../io.js';
import { loadConfig, jira, git, work } from '@conductor-kit/core';

type ConfigLike = {
  mr?: { target_branch?: string };
  jira?: { transitions?: { resolve?: { to?: string } } };
};

export const landCommand = defineCommand({
  meta: {
    description: 'After merge: transition Jira → Resolved, clean up local branch',
  },
  args: {
    ...globalArgs,
    key: {
      type: 'positional',
      required: false,
      description: 'Jira issue key (inferred from branch if omitted)',
    },
    'no-transition': {
      type: 'boolean',
      default: false,
      description: 'Skip the Jira transition',
    },
    'no-cleanup': {
      type: 'boolean',
      default: false,
      description: 'Keep the local feature branch',
    },
    force: {
      type: 'boolean',
      default: false,
      description: 'Proceed even when the branch is not detected as merged',
    },
  },
  async run({ args }) {
    const cwd = (args.cwd as string | undefined) ?? process.cwd();
    const cfg = (await loadConfig({ cwd })) as ConfigLike;
    const targetBranch = cfg.mr?.target_branch ?? 'main';

    const currentBranch = await git.currentBranch(cwd);
    const issueKey = (args.key as string | undefined) ?? inferIssueFromBranch(currentBranch);
    if (!issueKey) {
      throw new Error(
        `Cannot infer Jira key from branch "${currentBranch}". Pass <KEY> explicitly.`,
      );
    }

    const featureBranch = currentBranch !== targetBranch ? currentBranch : null;

    // Fetch + detect merge
    await git.fetchRemote('origin', cwd).catch(() => {
      /* offline-friendly: continue */
    });

    let merged = false;
    if (featureBranch) {
      merged = await git.isMerged(featureBranch, `origin/${targetBranch}`, cwd);
    }
    if (!merged && !args.force) {
      throw new Error(
        `Branch "${featureBranch ?? currentBranch}" is not merged into origin/${targetBranch} yet. ` +
          `Merge the MR first, or pass --force to proceed anyway.`,
      );
    }

    // Switch to main + pull
    if (featureBranch) {
      await git.checkoutBranch(targetBranch, cwd, { create: false });
    }
    await git.pullFastForward(cwd).catch((err: unknown) => {
      process.stderr.write(`[warn] pull --ff-only failed: ${(err as Error).message}\n`);
    });

    // Jira RESOLVE
    const resolveTo = cfg.jira?.transitions?.resolve?.to;
    let transitioned = false;
    if (!args['no-transition'] && resolveTo) {
      try {
        await jira.transition(issueKey, resolveTo);
        transitioned = true;
      } catch (err) {
        process.stderr.write(`[warn] Jira transition skipped: ${(err as Error).message}\n`);
      }
    }

    // Update work file status → landed
    const wf = await work.readWork(cwd, issueKey);
    if (wf && wf.status !== 'landed') {
      const patched = wf.raw.replace(/status:\s*[a-z-]+/i, 'status: landed');
      await writeFile(work.workPath(cwd, issueKey), patched, 'utf8');
    }

    // Delete local feature branch
    let deleted = false;
    if (featureBranch && !args['no-cleanup']) {
      try {
        await git.deleteBranch(featureBranch, cwd, { force: Boolean(args.force) });
        deleted = true;
      } catch (err) {
        process.stderr.write(
          `[warn] could not delete local branch ${featureBranch}: ${(err as Error).message}\n`,
        );
      }
    }

    if (args.json) {
      emitHandoff({
        status: 'ok',
        phase: 'land/complete',
        data: {
          issue_key: issueKey,
          merged_into: targetBranch,
          jira_transitioned: transitioned,
          local_branch_deleted: deleted,
        },
        handoff: { next_cmd: `conductor recap ${issueKey}` },
      });
      return;
    }

    console.log(`land ${issueKey}`);
    console.log(`  merged into : ${targetBranch}`);
    console.log(`  jira        : ${transitioned ? `→ ${resolveTo}` : '(skipped)'}`);
    console.log(`  local branch: ${deleted ? 'deleted' : 'kept'}`);
    console.log(`  work status : landed`);
    console.log(`\nNext → conductor recap ${issueKey}`);
  },
});

function inferIssueFromBranch(branch: string): string | null {
  const m = branch.match(/\/([A-Z][A-Z0-9]+-\d+)(?:-|$)/);
  return m?.[1] ?? null;
}
