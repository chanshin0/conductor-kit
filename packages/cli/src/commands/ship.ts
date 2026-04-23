import { defineCommand } from 'citty';
import { writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { globalArgs } from '../global-args.js';
import { emitHandoff, emitJson, promptOne } from '../io.js';
import {
  loadConfig,
  work,
  git,
  jira,
  runValidation,
  renderTemplateFile,
  createMr,
  GitLabFatalError,
  filesTouchUI,
  parsePlanScope,
  findOutOfScope,
  resolveAuthorship,
  detectGitUser,
  type MrOutcome,
  type ValidationReport,
} from '@conductor-kit/core';

type ConfigLike = {
  mr?: { target_branch?: string };
  jira?: { base_url?: string };
  gitlab?: { base_url?: string; project_path?: string };
  validation?: { static?: string[] };
  ui?: { change_globs?: string[] };
  agent?: { label?: string };
  authorship_footer?: { fallback_agent?: string };
};

const require = createRequire(import.meta.url);
function readCliVersion(): string {
  try {
    const pkg = require('../../package.json') as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/** Extract the Jira key from a conductor-style branch (`feat/ACME-42-slug`). */
function inferIssueFromBranch(branch: string): string | null {
  const m = branch.match(/\/([A-Z][A-Z0-9]+-\d+)(?:-|$)/);
  return m?.[1] ?? null;
}

function commitTypeFromBranch(branch: string): string {
  return branch.split('/')[0] ?? 'feat';
}

/** Pull the first non-empty line under "## 목표" from a work file. */
function planGoalOneLiner(workRaw: string): string {
  const m = workRaw.match(/##\s*목표\s*\n([\s\S]*?)(?=\n##\s|\n$)/);
  if (!m) return '';
  const body = m[1] ?? '';
  for (const line of body.split('\n')) {
    const t = line.trim().replace(/^[-*]\s*/, '');
    if (t) return t;
  }
  return '';
}

function buildCommitSubject(type: string, issueKey: string, goalLine: string): string {
  const short = goalLine && goalLine.length <= 60
    ? goalLine
    : goalLine
      ? goalLine.slice(0, 57) + '...'
      : '변경 적용';
  return `${type}: ${issueKey} ${short}`;
}

/**
 * `conductor ship` — v1 scope.
 *
 * Responsibilities:
 *   1. Gate: work-file status must be plan-approved or implementing.
 *   2. Run workflow.yml > validation.static in parallel; abort on any failure.
 *   3. Detect UI surface changes; require --ui-verify <gif> or
 *      --skip-ui-check <reason> when present.
 *   4. Render + write commit message (auto-draft from plan's "목표").
 *   5. git add -A / commit / push.
 *   6. Render MR body, call createMr(). glab first, prefill URL fallback.
 *   7. Render + post Jira ship comment. acli missing → mark manual.
 *   8. Flip .work/{KEY}.md status to `shipped` and emit handoff.
 *
 * Known v1 gaps (tracked for follow-up):
 *   - No deviation detection (plan 영향 범위 vs diff comparison).
 *   - No Phase 1.8 goal-backward reflection.
 *   - Commit message has no interactive approval loop — caller can preview
 *     with --dry-run first.
 */
export const shipCommand = defineCommand({
  meta: { description: 'Validate → commit → push → MR → Jira ship comment' },
  args: {
    ...globalArgs,
    key: {
      type: 'positional',
      required: false,
      description: 'Jira issue key (inferred from branch if omitted)',
    },
    'skip-ui-check': {
      type: 'string',
      description: 'Skip UI verification with a human-readable reason',
    },
    'ui-verify': {
      type: 'string',
      description: 'Path to a GIF proving manual UI verification',
    },
    'dry-run': {
      type: 'boolean',
      default: false,
      description: 'Preview commit / MR / Jira payloads without side effects',
    },
  },
  async run({ args }) {
    const cwd = (args.cwd as string | undefined) ?? process.cwd();
    const jsonMode = Boolean(args.json);
    const dryRun = Boolean(args['dry-run']);

    const cfg = (await loadConfig({ cwd })) as ConfigLike;
    const targetBranch = cfg.mr?.target_branch ?? 'main';
    const branch = await git.currentBranch(cwd);
    const issueKey =
      (args.key as string | undefined) ?? inferIssueFromBranch(branch) ?? null;
    if (!issueKey) {
      throw new Error(
        `Cannot infer Jira key from branch "${branch}". Pass <KEY> explicitly.`,
      );
    }

    // --- Phase 0: plan-approval gate ---
    const wf = await work.readWork(cwd, issueKey);
    work.assertShippable(wf);
    const workRaw = wf!.raw;

    // --- Phase 1: static validation ---
    const commands = cfg.validation?.static ?? [
      'pnpm run lint',
      'pnpm run type-check',
      'pnpm run test',
    ];
    const report: ValidationReport = dryRun
      ? { ok: true, checks: [], totalMs: 0 }
      : await runValidation(commands, { cwd });

    if (!report.ok) {
      if (jsonMode) {
        emitHandoff({
          status: 'blocked',
          phase: 'ship/validation-failed',
          data: {
            issue_key: issueKey,
            checks: report.checks.map((c) => ({
              command: c.command,
              ok: c.ok,
              exit_code: c.exitCode,
              duration_ms: c.durationMs,
            })),
          },
        });
      } else {
        console.error('Validation failed:');
        for (const c of report.checks.filter((x) => !x.ok)) {
          console.error(`  ✗ ${c.command}  (exit ${c.exitCode})`);
          console.error(c.tail.replace(/^/gm, '      '));
        }
      }
      process.exitCode = 1;
      return;
    }

    // --- Phase 1.4: Deviation detection (plan 영향 범위 vs git diff) ---
    // If the plan listed specific files/globs and the diff includes files that
    // match none of them, ask the user what to do. Recording scope drift loudly
    // is the whole point of having a plan — silent drift makes retros useless.
    const changedFiles = dryRun ? [] : await git.diffNames(`origin/${targetBranch}`, cwd);
    const planScope = parsePlanScope(workRaw);
    const deviationFiles = findOutOfScope(changedFiles, planScope);
    const ctx = { json: jsonMode, auto: Boolean(args.auto) };

    if (deviationFiles.length > 0 && !dryRun) {
      const answer = await promptOne(
        {
          id: 'deviation',
          prompt:
            `Files changed outside the plan's 영향 범위 (${deviationFiles.length}): ` +
            `${deviationFiles.slice(0, 5).join(', ')}${deviationFiles.length > 5 ? ', ...' : ''}. ` +
            `How to proceed?`,
          choices: ['extend-plan', 'revert', 'ignore'],
          default: 'extend-plan',
        },
        ctx,
      );

      if (answer === 'revert') {
        const msg =
          `Plan deviation — reverting. Unstage / restore the out-of-scope files then re-run \`conductor ship\`. ` +
          `Files: ${deviationFiles.join(', ')}`;
        if (jsonMode) {
          emitHandoff({
            status: 'blocked',
            phase: 'ship/deviation-revert',
            data: { issue_key: issueKey, out_of_scope: deviationFiles },
            handoff: { message: msg },
          });
        } else {
          console.error(msg);
        }
        process.exitCode = 1;
        return;
      }

      if (answer === 'extend-plan') {
        // Append the unplanned files into the "영향 범위" section so the plan
        // reflects reality. Keeps the audit trail honest without asking the
        // user to hand-edit the work file mid-ship.
        const addendum =
          `\n<!-- appended by conductor ship --deviation:extend-plan -->\n` +
          deviationFiles.map((f) => `- ${f} — scope extension`).join('\n') +
          '\n';
        const patched = workRaw.replace(
          /(##\s*영향 범위\s*\n[\s\S]*?)(?=\n##\s|\n$)/,
          (_, sec) => sec.trimEnd() + addendum,
        );
        if (patched !== workRaw) {
          await work.writeWork(cwd, issueKey, patched);
        }
      }
      // 'ignore' falls through — deviation is logged in ship output only.
    }

    // --- Phase 1.5: UI change detection ---
    const uiGlobs = cfg.ui?.change_globs;
    const uiChanged = filesTouchUI(changedFiles, uiGlobs);
    const uiSkipReason = args['skip-ui-check'] as string | undefined;
    const uiVerifyGif = args['ui-verify'] as string | undefined;

    if (uiChanged && !dryRun && !uiSkipReason && !uiVerifyGif) {
      const msg =
        `UI files changed — re-run with --ui-verify <gif-path> OR --skip-ui-check "<reason>". ` +
        `Examples in diff: ${changedFiles.filter((f) => filesTouchUI([f], uiGlobs)).slice(0, 3).join(', ')}`;
      if (jsonMode) {
        emitHandoff({
          status: 'blocked',
          phase: 'ship/ui-verify-required',
          data: { issue_key: issueKey, changed_files: changedFiles },
          handoff: { message: msg },
        });
      } else {
        console.error(msg);
      }
      process.exitCode = 1;
      return;
    }
    const uiNote = uiVerifyGif
      ? `• UI GIF: ${uiVerifyGif}`
      : uiSkipReason
        ? `• UI 검증 스킵: ${uiSkipReason}`
        : '';

    // --- Authorship footer context (used in MR body + Jira comment) ---
    const authorship = resolveAuthorship({
      command: 'ship',
      flagAgent: args.agent as string | undefined,
      envAgent: process.env.CONDUCTOR_AGENT,
      configAgent: cfg.agent?.label,
      fallbackAgent: cfg.authorship_footer?.fallback_agent,
      cliVersion: readCliVersion(),
      user: await detectGitUser(cwd),
    });
    const footerValues = {
      COMMAND: authorship.command,
      AGENT: authorship.agent,
      CLI_VERSION: authorship.cli_version,
      USER: authorship.user,
    };

    // --- Phase 2: commit message + commit + push ---
    const commitType = commitTypeFromBranch(branch);
    const goalLine = planGoalOneLiner(workRaw);
    const jiraBaseUrl = cfg.jira?.base_url ?? '<YOUR_JIRA_BASE_URL>';

    const commitMsgDraft = await renderTemplateFile('commit-message', {
      TYPE: commitType,
      ISSUE_KEY: issueKey,
      KOREAN_SUBJECT: goalLine || '변경 적용',
      OPTIONAL_BODY: '',
      JIRA_BASE_URL: jiraBaseUrl,
    });

    // Commit-message approval: in --json mode the adapter can edit the draft
    // by piping a replacement string back on stdin. In TTY mode, the user can
    // accept (Enter) or type a replacement single line (multi-line edits must
    // use --dry-run to preview + shell redirection or --auto to bypass).
    let commitMsg = commitMsgDraft;
    if (!dryRun) {
      const approved = await promptOne(
        {
          id: 'commit-message-approval',
          prompt:
            'Approve commit message (press Enter to accept the draft, or paste a replacement):',
          default: commitMsgDraft,
        },
        ctx,
      );
      if (approved && approved !== commitMsgDraft) {
        commitMsg = approved;
      }
    }

    if (dryRun) {
      if (jsonMode) {
        emitJson({ type: 'preview', id: 'commit-message', content: commitMsg });
      } else {
        console.log('--- commit message (dry-run) ---');
        console.log(commitMsg);
      }
    } else {
      if (!(await git.isClean(cwd))) {
        await git.addAll(cwd);
      }
      try {
        await git.commit(commitMsg, cwd);
      } catch (err) {
        throw new Error(
          `git commit failed: ${(err as Error).message}. Did you stage changes, or did a pre-commit hook fail?`,
        );
      }
      try {
        await git.pushHead('origin', cwd);
      } catch (err) {
        throw new Error(
          `git push failed: ${(err as Error).message}. Resolve and re-run conductor ship.`,
        );
      }
    }

    // --- Phase 3: MR body + MR + Jira ship comment ---
    const mrBody = await renderTemplateFile('mr-template', {
      issue_key: issueKey,
      issue_title: goalLine || issueKey,
      JIRA_BASE_URL: jiraBaseUrl,
      ...footerValues,
    });
    const mrBodyFile = work.workPath(cwd, issueKey).replace(/\.md$/, '-mr-body.md');
    await writeFile(mrBodyFile, mrBody, 'utf8');

    let mrOutcome: MrOutcome | null = null;
    let mrFatal: string | null = null;
    if (!dryRun) {
      try {
        mrOutcome = await createMr({
          cwd,
          sourceBranch: branch,
          targetBranch,
          title: buildCommitSubject(commitType, issueKey, goalLine),
          bodyFile: mrBodyFile,
          gitlabBaseUrl: cfg.gitlab?.base_url,
          gitlabProjectPath: cfg.gitlab?.project_path,
        });
      } catch (err) {
        if (err instanceof GitLabFatalError) {
          mrFatal = err.message;
        } else {
          throw err;
        }
      }
    }

    // Jira ship comment — only on confirmed MR (prefill fallback needs manual posting).
    let jiraCommented = false;
    let jiraErr: string | null = null;
    if (mrOutcome?.kind === 'created') {
      const shipComment = await renderTemplateFile('jira-comment-ship', {
        ISSUE_KEY: issueKey,
        MR_URL: mrOutcome.url,
        BRANCH: branch,
        TARGET_BRANCH: targetBranch,
        SUBJECT: goalLine || issueKey,
        UI_NOTE: uiNote,
        ...footerValues,
      });
      const commentFile = work.workPath(cwd, issueKey).replace(/\.md$/, '-ship-comment.md');
      await writeFile(commentFile, shipComment, 'utf8');
      try {
        await jira.comment(issueKey, `@${commentFile}`);
        jiraCommented = true;
      } catch (err) {
        jiraErr = (err as Error).message;
      }
    }

    // Flip work status to `shipped`. Re-read the file here because earlier
    // phases (extend-plan) may have appended to it — using the captured
    // workRaw would clobber those additions.
    if (!dryRun) {
      const fresh = await work.readWork(cwd, issueKey);
      if (fresh) {
        const patched = fresh.raw.replace(/status:\s*[a-z-]+/i, 'status: shipped');
        if (patched !== fresh.raw) {
          await work.writeWork(cwd, issueKey, patched);
        }
      }
    }

    // --- Handoff ---
    if (jsonMode) {
      if (mrFatal) {
        emitHandoff({
          status: 'blocked',
          phase: 'ship/mr-fatal',
          data: { issue_key: issueKey, error: mrFatal },
        });
      } else if (mrOutcome?.kind === 'created') {
        emitHandoff({
          status: 'ok',
          phase: 'ship/complete',
          data: {
            issue_key: issueKey,
            mr_url: mrOutcome.url,
            jira_commented: jiraCommented,
            jira_error: jiraErr,
            dry_run: dryRun,
          },
          handoff: { next_cmd: `conductor land ${issueKey}` },
        });
      } else if (mrOutcome?.kind === 'prefill') {
        emitHandoff({
          status: 'ok',
          phase: 'ship/mr-pending',
          data: {
            issue_key: issueKey,
            prefill_url: mrOutcome.url,
            body_file: mrBodyFile,
            body_truncated: mrOutcome.body_truncated,
          },
          handoff: { message: 'Open prefill URL → Create → then run conductor land.' },
        });
      } else {
        emitHandoff({
          status: 'ok',
          phase: 'ship/dry-run',
          data: { issue_key: issueKey, mr_body_file: mrBodyFile },
        });
      }
      return;
    }

    if (mrFatal) {
      console.error(`ship ${issueKey}: MR creation fatal — ${mrFatal}`);
      process.exitCode = 1;
      return;
    }
    console.log(`ship ${issueKey}`);
    if (mrOutcome?.kind === 'created') {
      console.log(`  MR: ${mrOutcome.url}`);
      console.log(
        `  Jira comment: ${jiraCommented ? 'posted' : `FAILED (${jiraErr ?? 'skipped'})`}`,
      );
      console.log(`  Work status: shipped`);
      console.log(`\nNext → conductor land ${issueKey}`);
    } else if (mrOutcome?.kind === 'prefill') {
      console.log(`  MR: (prefill — open to create)`);
      console.log(`       ${mrOutcome.url}`);
      console.log(`  Body file: ${mrBodyFile}`);
      console.log(`\nNext → click "Create" then conductor land ${issueKey}`);
    } else {
      console.log(`  (dry-run — nothing pushed)`);
      console.log(`  Rendered MR body: ${mrBodyFile}`);
    }
  },
});
