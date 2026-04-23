import { defineCommand } from 'citty';
import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { globalArgs } from '../global-args.js';
import { emitHandoff } from '../io.js';
import {
  loadConfig,
  renderTemplateFile,
  AcliMissingError,
  jira,
  type JiraSearchHit,
} from '@conductor-kit/core';

type ConfigLike = {
  project_key?: string;
  jira?: { base_url?: string };
};

/**
 * Minimal keyword extractor: split on whitespace / punctuation, drop very
 * short tokens. Deterministic so test output is stable. Callers that want
 * smarter NLP can post-process the result.
 */
export function extractKeywords(description: string, max = 5): string[] {
  const tokens = description
    .toLowerCase()
    .split(/[\s,.;:!?"'`()\[\]{}]+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
  // Deduplicate while preserving order.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tokens) {
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'for', 'of', 'to', 'in', 'on', 'at',
  'is', 'are', 'was', 'were', 'be', 'been', 'this', 'that', 'it', 'its',
  '은', '는', '이', '가', '을', '를', '에', '의', '로', '으로', '와', '과',
  '도', '만', '부터', '까지', '하는', '하고', '한다',
]);

export function buildJql(projectKey: string, keywords: string[]): string {
  if (keywords.length === 0) {
    return `project = ${projectKey} ORDER BY created DESC`;
  }
  const or = keywords.map((k) => `"${k.replace(/"/g, '\\"')}"`).join(' OR ');
  return `project = ${projectKey} AND text ~ (${or}) ORDER BY created DESC`;
}

/**
 * `conductor draft` — turn a free-form description into a structured Jira
 * issue draft. **Never auto-creates the issue** — the user posts it manually
 * after reviewing `.work/_drafts/{timestamp}.md`.
 *
 * Duplicate detection: `acli jira workitem search` with keyword-based JQL.
 * Missing/unauthenticated acli → draft is still rendered, duplicate list is
 * empty, and the handoff flags the gap.
 */
export const draftCommand = defineCommand({
  meta: {
    description: 'Render a Jira issue draft from a free-form description (no auto-create)',
  },
  args: {
    ...globalArgs,
    description: {
      type: 'positional',
      required: true,
      description: 'Free-form text describing the issue',
    },
    type: {
      type: 'string',
      default: 'Task',
      description: 'Suggested Jira issue type (Task / Bug / Improvement / Story)',
    },
    priority: {
      type: 'string',
      description: 'Suggested priority (falls back to a heuristic if omitted)',
    },
  },
  async run({ args }) {
    const cwd = (args.cwd as string | undefined) ?? process.cwd();
    const jsonMode = Boolean(args.json);
    const description = String(args.description);

    const cfg = (await loadConfig({ cwd })) as ConfigLike;
    const projectKey = cfg.project_key;
    if (!projectKey || projectKey.startsWith('<')) {
      throw new Error(
        `project_key is not set in .conductor/workflow.yml — set it first (top-level key) or re-run conductor init with --project-key.`,
      );
    }

    // --- Duplicate detection via acli ---
    const keywords = extractKeywords(description);
    const jql = buildJql(projectKey, keywords);
    let duplicates: JiraSearchHit[] = [];
    let acliMissing = false;
    try {
      duplicates = await jira.search(jql, { maxResults: 10 });
    } catch (err) {
      if (err instanceof AcliMissingError) {
        acliMissing = true;
      } else {
        // Non-fatal: search failed but we still render the draft.
        process.stderr.write(
          `[warn] acli search failed: ${(err as Error).message}\n`,
        );
      }
    }

    // --- Render the draft template ---
    const typeGuess = String(args.type ?? 'Task');
    const priorityGuess =
      (args.priority as string | undefined) ?? heuristicPriority(description);

    const draft = await renderTemplateFile('draft-issue', {
      background: description.trim(),
      reproduction: '',
      observed: '',
      expected: '',
      impact: '',
      file_candidates: '',
      related_past_issues: duplicates.length
        ? duplicates.slice(0, 3).map((d) => `- ${d.key}: ${d.summary} (${d.status})`).join('\n')
        : '없음 — 자동 탐지 결과 유사 이슈 없음',
      uncertainties: '',
      suggested_priority: priorityGuess,
      suggested_type: typeGuess,
      priority_reasoning: args.priority
        ? '사용자 지정'
        : '자동 휴리스틱 — 설명 톤 기반 (재확인 필요)',
    });

    const draftDir = join(cwd, '.work', '_drafts');
    if (!existsSync(draftDir)) await mkdir(draftDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const draftFile = join(draftDir, `${stamp}.md`);
    await writeFile(draftFile, draft, 'utf8');

    // --- Handoff ---
    const createCmd = `acli jira workitem create --project ${projectKey} --type ${typeGuess} --summary "${summaryFromDescription(description)}" --description @${draftFile}`;

    if (jsonMode) {
      emitHandoff({
        status: 'ok',
        phase: 'draft/complete',
        data: {
          draft_file: draftFile,
          project_key: projectKey,
          suggested_type: typeGuess,
          suggested_priority: priorityGuess,
          duplicates,
          acli_missing: acliMissing,
          create_command: createCmd,
        },
        handoff: {
          message: duplicates.length
            ? 'Review duplicates before creating; draft is ready either way.'
            : 'Draft ready — review + run the create_command to post.',
        },
      });
      return;
    }

    console.log(`draft ready: ${draftFile}`);
    console.log(`  type     : ${typeGuess}`);
    console.log(`  priority : ${priorityGuess}`);
    if (acliMissing) {
      console.log(`  dup-check: SKIPPED (acli missing)`);
    } else if (duplicates.length === 0) {
      console.log(`  dup-check: no similar issues found`);
    } else {
      console.log(`  ⚠️ similar issues:`);
      for (const d of duplicates.slice(0, 3)) {
        console.log(`    ${d.key}  ${d.summary}  [${d.status}]`);
      }
    }
    console.log(`\nTo post, run:\n  ${createCmd}`);
  },
});

function summaryFromDescription(desc: string): string {
  const line = desc.trim().split('\n')[0] ?? '';
  return line.length <= 80 ? line : line.slice(0, 77) + '...';
}

function heuristicPriority(desc: string): string {
  const lower = desc.toLowerCase();
  if (/(crash|data loss|security|outage|production.?down|prod.?down)/.test(lower)) {
    return 'Critical';
  }
  if (/(block|broken|regression|fail|error)/.test(lower)) return 'High';
  if (/(improve|refactor|cleanup|optimi[sz]e)/.test(lower)) return 'Low';
  return 'Medium';
}
