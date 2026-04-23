/**
 * Categories used by `conductor tune` to route feedback. Kept intentionally
 * small — the legacy plugin had 7 categories but most folded down to one of
 * these four after the SSOT split. Host repos can add more categories by
 * extending tune-log.md; the CLI only enforces these four.
 */
export type TuneCategory =
  | 'command-behavior' // adapter slash-command files / CLI subcommand behaviour
  | 'template' // workflow/templates/*.md
  | 'config' // .conductor/workflow.yml or host-repo convention docs
  | 'convention'; // .conductor/CONVENTIONS.md

export interface TuneClassification {
  category: TuneCategory;
  /** Confidence in [0, 1]. Rule-based — anchored by keyword hit counts. */
  confidence: number;
  /** Short explanation naming the rule that fired. */
  rationale: string;
  /** Paths / globs the agent should inspect when proposing a diff. */
  candidate_targets: string[];
}

interface Rule {
  category: TuneCategory;
  /** Lower-cased keyword or Korean noun phrase. Each hit increments the score. */
  keywords: readonly string[];
  /** Files / globs to surface when this category wins. */
  targets: readonly string[];
  /** Human-readable rule name used in the `rationale` field. */
  name: string;
}

const RULES: readonly Rule[] = [
  {
    category: 'command-behavior',
    name: 'command-behavior',
    keywords: [
      'command', 'slash', 'prompt', 'behaviour', 'behavior', 'flag', 'argument',
      '커맨드', '슬래시', '프롬프트', '동작', '플래그', '인자',
      'pick', 'ship', 'land', 'recap', 'draft', 'tune', 'autopilot', 'where', 'init',
    ],
    targets: [
      'packages/agent-claude/commands/*.md',
      'packages/agent-codex/prompts/*.md',
      'packages/agent-cursor/.cursor/commands/*.md',
      'packages/cli/src/commands/*.ts',
    ],
  },
  {
    category: 'template',
    name: 'template-wording',
    keywords: [
      'template', 'mr body', 'commit message', 'recap', 'jira comment',
      '템플릿', 'mr 본문', '커밋 메시지', '코멘트', '플레이스홀더',
    ],
    targets: ['packages/assets/workflow/templates/*.md'],
  },
  {
    category: 'config',
    name: 'workflow-config',
    keywords: [
      'config', 'workflow.yml', 'validation', 'project key', 'jira url', 'gitlab',
      '설정', '유효성', '프로젝트 키',
    ],
    targets: [
      '.conductor/workflow.yml',
      'packages/assets/workflow/config.defaults.yml',
    ],
  },
  {
    category: 'convention',
    name: 'conventions-md',
    keywords: [
      'convention', 'rule', 'guideline', 'branch naming', 'commit style',
      '규칙', '컨벤션', '브랜치', '커밋 스타일',
    ],
    targets: ['.conductor/CONVENTIONS.md', 'packages/assets/references/conventions.md'],
  },
];

/**
 * Score each rule by counting keyword hits in `feedback` (case-insensitive).
 * Returns the winning category with confidence = hits / maxRuleHits clamped
 * to [0, 1], or a default `command-behavior` classification with 0
 * confidence when no rule matches (telling the agent to look more broadly).
 */
export function classifyFeedback(feedback: string): TuneClassification {
  const text = feedback.toLowerCase();
  let best: { rule: Rule; hits: number } | null = null;
  let totalHits = 0;

  for (const rule of RULES) {
    const hits = rule.keywords.reduce(
      (n, k) => (text.includes(k.toLowerCase()) ? n + 1 : n),
      0,
    );
    totalHits += hits;
    if (!best || hits > best.hits) best = { rule, hits };
  }

  if (!best || best.hits === 0) {
    return {
      category: 'command-behavior',
      confidence: 0,
      rationale: 'no keyword match — defaulting to command-behavior (agent: inspect broadly)',
      candidate_targets: RULES[0]!.targets.slice(),
    };
  }

  return {
    category: best.rule.category,
    // Confidence is the share of all keyword hits that went to this rule.
    // Keeps the score meaningful when multiple rules fire.
    confidence: totalHits > 0 ? Math.min(1, best.hits / totalHits) : 0,
    rationale: `rule "${best.rule.name}" matched ${best.hits} keyword${best.hits === 1 ? '' : 's'}`,
    candidate_targets: best.rule.targets.slice(),
  };
}

/** Format a tune-log entry ready to append to `.conductor/tune-log.md`. */
export function formatTuneLogEntry(input: {
  date: string; // YYYY-MM-DD
  shortDesc: string;
  user: string;
  feedback: string;
  classification: TuneClassification;
  status: 'proposed' | 'applied' | 'deferred' | 'rejected';
  note?: string;
}): string {
  return (
    `## ${input.date} — ${input.shortDesc}\n` +
    `- 제출: ${input.user}\n` +
    `- 피드백 원문: ${JSON.stringify(input.feedback)}\n` +
    `- 카테고리: ${input.classification.category}\n` +
    `- 후보 대상:\n` +
    input.classification.candidate_targets.map((t) => `    - ${t}`).join('\n') +
    '\n' +
    `- 분류 근거: ${input.classification.rationale} (confidence ${input.classification.confidence.toFixed(2)})\n` +
    `- 상태: ${input.status}\n` +
    (input.note ? `- 메모: ${input.note}\n` : '')
  );
}
