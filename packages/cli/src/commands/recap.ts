import { defineCommand } from 'citty';
import { writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { globalArgs } from '../global-args.js';
import { emitHandoff } from '../io.js';
import {
  loadConfig,
  work,
  git,
  jira,
  renderTemplateFile,
  findRemainingPlaceholders,
  resolveAuthorship,
  detectGitUser,
} from '@conductor-kit/core';

type ConfigLike = {
  jira?: { base_url?: string };
  mr?: { target_branch?: string };
  confluence?: { space_key?: string; parent_id?: string };
  agent?: { label?: string };
  authorship_footer?: { fallback_agent?: string };
};

const require = createRequire(import.meta.url);
function readCliVersion(): string {
  try {
    return (require('../../package.json') as { version?: string }).version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function inferIssueFromBranch(branch: string): string | null {
  return branch.match(/\/([A-Z][A-Z0-9]+-\d+)(?:-|$)/)?.[1] ?? null;
}

/** Pull the first non-empty bullet under `## <name>` section. */
function sectionFirstLine(raw: string, headingKo: string): string {
  const re = new RegExp(`##\\s*${headingKo}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|\\n$)`);
  const body = raw.match(re)?.[1] ?? '';
  for (const line of body.split('\n')) {
    const t = line.trim().replace(/^[-*]\s*/, '');
    if (t && !t.startsWith('<!--')) return t;
  }
  return '';
}

/** Extract MR URL from work file — either a `MR: <url>` line or any gitlab-ish URL. */
function extractMrUrl(raw: string): string {
  const line = raw.match(/(?:^|\n)\s*(?:-\s*)?MR\s*:\s*(\S+)/i);
  if (line) return line[1]!.trim();
  const any = raw.match(/https?:\/\/\S+\/merge_requests\/\d+/);
  return any?.[0] ?? '';
}

/**
 * `conductor recap` — post-merge result comment (+ optional Confluence draft).
 *
 * Principle: **never auto-publish Confluence**. Jira comment posts after the
 * draft is rendered (acli call); Confluence draft stays on disk for the
 * user to copy across manually. This mirrors the legacy plugin's "거짓 성공
 * 금지" rule — we won't silently claim success on a publish we didn't do.
 */
export const recapCommand = defineCommand({
  meta: {
    description: 'Post-merge result comment on Jira (+ optional Confluence draft)',
  },
  args: {
    ...globalArgs,
    key: {
      type: 'positional',
      required: false,
      description: 'Jira issue key (inferred from branch if omitted)',
    },
    confluence: {
      type: 'boolean',
      default: false,
      description: 'Additionally render a Confluence page draft to .work/{KEY}-recap-page.md',
    },
    'dry-run': {
      type: 'boolean',
      default: false,
      description: 'Render templates and print them; do not post to Jira',
    },
  },
  async run({ args }) {
    const cwd = (args.cwd as string | undefined) ?? process.cwd();
    const jsonMode = Boolean(args.json);
    const dryRun = Boolean(args['dry-run']);

    const cfg = (await loadConfig({ cwd })) as ConfigLike;
    const branch = await git.currentBranch(cwd);
    const issueKey =
      (args.key as string | undefined) ?? inferIssueFromBranch(branch) ?? null;
    if (!issueKey) {
      throw new Error(
        `Cannot infer Jira key from branch "${branch}". Pass <KEY> explicitly.`,
      );
    }

    const wf = await work.readWork(cwd, issueKey);
    if (!wf) {
      throw new Error(
        `No work file .work/${issueKey}.md — pick + ship + land this issue before recap.`,
      );
    }
    // Recap is for after the merge. `shipped` is permissive too because some
    // teams call recap right after MR is merged externally, before land runs.
    if (wf.status !== 'shipped' && wf.status !== 'landed') {
      throw new Error(
        `Cannot recap: work status is "${wf.status}". Run \`conductor land ${issueKey}\` first.`,
      );
    }

    // --- Authorship footer ---
    const authorship = resolveAuthorship({
      command: 'recap' + (args.confluence ? ' --confluence' : ''),
      flagAgent: args.agent as string | undefined,
      envAgent: process.env.CONDUCTOR_AGENT,
      configAgent: cfg.agent?.label,
      fallbackAgent: cfg.authorship_footer?.fallback_agent,
      cliVersion: readCliVersion(),
      user: await detectGitUser(cwd),
    });
    const footer = {
      COMMAND: authorship.command,
      AGENT: authorship.agent,
      CLI_VERSION: authorship.cli_version,
      USER: authorship.user,
    };

    // --- Extract recap inputs from the work file ---
    const goalOne = sectionFirstLine(wf.raw, '목표') || issueKey;
    const implApproachOne = sectionFirstLine(wf.raw, '구현 접근');
    const mrUrl = extractMrUrl(wf.raw);

    // Fields we cannot derive deterministically stay as literal placeholders
    // so the user can fill them in before posting. renderTemplate leaves
    // unknown slots intact.
    const comment = await renderTemplateFile('recap-comment', {
      goal_one_liner: goalOne,
      diff_summary_one_liner: implApproachOne,
      mr_url: mrUrl,
      ...footer,
    });

    const commentFile = work.workPath(cwd, issueKey).replace(/\.md$/, '-recap-comment.md');
    await writeFile(commentFile, comment, 'utf8');

    // --- Optional Confluence draft (never auto-publish) ---
    let pageFile: string | null = null;
    if (args.confluence) {
      const page = await renderTemplateFile('recap-page', {
        issue_key: issueKey,
        ISSUE_KEY: issueKey,
        jira_url: cfg.jira?.base_url
          ? `${cfg.jira.base_url.replace(/\/+$/, '')}/browse/${issueKey}`
          : '<YOUR_JIRA_BASE_URL>',
        ...footer,
      });
      pageFile = work.workPath(cwd, issueKey).replace(/\.md$/, '-recap-page.md');
      await writeFile(pageFile, page, 'utf8');
    }

    // --- Post the Jira comment (dry-run skips) ---
    // Guard: if uppercase placeholders remain (things like {MR_URL} that we
    // failed to fill), refuse to post a half-rendered comment. --yes lets the
    // caller force-post anyway (e.g. when the comment is already a known-good
    // manual edit of the draft file).
    const remaining = findRemainingPlaceholders(comment);
    const forcePost = Boolean(args.yes);
    let posted = false;
    let jiraErr: string | null = null;
    let blockedByPlaceholders = false;
    if (remaining.length > 0 && !forcePost && !dryRun) {
      blockedByPlaceholders = true;
    } else if (!dryRun) {
      try {
        await jira.comment(issueKey, `@${commentFile}`);
        posted = true;
      } catch (err) {
        jiraErr = (err as Error).message;
      }
    }

    const jiraStatus = dryRun
      ? '(dry-run, not posted)'
      : blockedByPlaceholders
        ? `NOT POSTED — unfilled placeholders: ${remaining.join(', ')}. Edit ${commentFile} then re-run with --yes.`
        : posted
          ? 'posted'
          : `FAILED (${jiraErr ?? 'unknown'})`;

    if (jsonMode) {
      emitHandoff({
        status: blockedByPlaceholders ? 'blocked' : 'ok',
        phase: blockedByPlaceholders ? 'recap/placeholders-remain' : 'recap/complete',
        data: {
          issue_key: issueKey,
          comment_file: commentFile,
          jira_posted: posted,
          jira_error: jiraErr,
          unfilled_placeholders: remaining,
          confluence_draft: pageFile,
          confluence_published: false,
          dry_run: dryRun,
        },
        handoff: {
          message: blockedByPlaceholders
            ? `Edit ${commentFile} to fill {${remaining[0]}}… then re-run with --yes.`
            : pageFile
              ? 'Confluence draft saved — publish manually (auto-publish disabled).'
              : 'Recap posted. Move on to the next issue.',
        },
      });
      return;
    }

    console.log(`recap ${issueKey}`);
    console.log(`  comment file : ${commentFile}`);
    console.log(`  jira comment : ${jiraStatus}`);
    if (pageFile) {
      console.log(`  confluence   : ${pageFile}  (draft only — publish manually)`);
    }
  },
});
