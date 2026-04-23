import { defineCommand } from 'citty';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { globalArgs } from '../global-args.js';
import { emitHandoff } from '../io.js';
import {
  classifyFeedback,
  formatTuneLogEntry,
  detectGitUser,
} from '@conductor-kit/core';

function isoDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

function shortDesc(feedback: string, max = 40): string {
  return feedback
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
    .join('-')
    .slice(0, max) || 'feedback';
}

/**
 * `conductor tune "<feedback>"` — rule-based classification + tune-log
 * entry. The CLI never edits source files — that stays with the agent so
 * the concrete diff can get human approval per the tune-log workflow.
 *
 * By default a `proposed` entry is appended to `.conductor/tune-log.md`.
 * The agent reads the classification + candidate targets, drafts a diff,
 * and (if the user approves) edits the log entry's `상태:` to `applied`
 * after making the change.
 */
export const tuneCommand = defineCommand({
  meta: {
    description: 'Classify workflow feedback into (command-behavior | template | config | convention)',
  },
  args: {
    ...globalArgs,
    feedback: {
      type: 'positional',
      required: true,
      description: 'Free-form feedback text',
    },
    status: {
      type: 'string',
      default: 'proposed',
      description: 'Initial status for the log entry (proposed / applied / deferred / rejected)',
    },
    note: {
      type: 'string',
      description: 'Optional one-line note appended to the log entry',
    },
    'log-only': {
      type: 'boolean',
      default: false,
      description: 'Append the log entry but do not print the handoff — useful for batch replay',
    },
  },
  async run({ args }) {
    const cwd = (args.cwd as string | undefined) ?? process.cwd();
    const feedback = String(args.feedback);
    const classification = classifyFeedback(feedback);

    const user = await detectGitUser(cwd);
    const entry = formatTuneLogEntry({
      date: isoDateOnly(),
      shortDesc: shortDesc(feedback),
      user,
      feedback,
      classification,
      status: (args.status as string) as
        | 'proposed'
        | 'applied'
        | 'deferred'
        | 'rejected',
      note: args.note as string | undefined,
    });

    const logDir = join(cwd, '.conductor');
    if (!existsSync(logDir)) await mkdir(logDir, { recursive: true });
    const logFile = join(logDir, 'tune-log.md');
    const existing = existsSync(logFile) ? await readFile(logFile, 'utf8') : '# tune-log\n\n';
    const separator = existing.endsWith('\n\n') ? '' : existing.endsWith('\n') ? '\n' : '\n\n';
    await writeFile(logFile, existing + separator + entry + '\n', 'utf8');

    if (args['log-only']) return;

    if (args.json) {
      emitHandoff({
        status: 'ok',
        phase: 'tune/classified',
        data: {
          classification,
          log_file: logFile,
          entry,
        },
        handoff: {
          message:
            'Agent: read candidate_targets, draft a diff, get user approval, apply, then update the log entry status to `applied`.',
        },
      });
      return;
    }

    console.log(`tune → ${classification.category}  (confidence ${classification.confidence.toFixed(2)})`);
    console.log(`  rule: ${classification.rationale}`);
    console.log(`  candidate targets:`);
    for (const t of classification.candidate_targets) console.log(`    - ${t}`);
    console.log(`  log entry appended to: ${logFile}`);
  },
});
