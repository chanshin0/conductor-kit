import { describe, it, expect } from 'vitest';
import { classifyFeedback, formatTuneLogEntry } from './tune.js';

describe('classifyFeedback', () => {
  it('routes commit-message feedback to template', () => {
    const r = classifyFeedback('The commit message template should include the branch name');
    expect(r.category).toBe('template');
    expect(r.candidate_targets).toContain('packages/assets/workflow/templates/*.md');
  });

  it('routes command-flag feedback to command-behavior', () => {
    const r = classifyFeedback('conductor ship should expose a --dry-run flag');
    expect(r.category).toBe('command-behavior');
  });

  it('routes validation-config feedback to config', () => {
    const r = classifyFeedback('We should tweak validation to skip type-check in local mode');
    expect(r.category).toBe('config');
  });

  it('routes branch-naming feedback to convention', () => {
    const r = classifyFeedback('Update branch naming convention to include the PR number');
    expect(r.category).toBe('convention');
  });

  it('falls back to command-behavior with confidence 0 when no rule matches', () => {
    const r = classifyFeedback('purple monkey dishwasher');
    expect(r.category).toBe('command-behavior');
    expect(r.confidence).toBe(0);
    expect(r.rationale).toContain('no keyword match');
  });

  it('confidence stays in [0, 1]', () => {
    const r = classifyFeedback('command slash command prompt command command');
    expect(r.confidence).toBeGreaterThan(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
  });
});

describe('formatTuneLogEntry', () => {
  it('renders a markdown entry with all required fields', () => {
    const entry = formatTuneLogEntry({
      date: '2026-04-23',
      shortDesc: 'add-dry-run-flag',
      user: 'dong',
      feedback: 'we should have --dry-run',
      classification: {
        category: 'command-behavior',
        confidence: 0.5,
        rationale: 'rule X matched 2 keywords',
        candidate_targets: ['packages/cli/src/commands/ship.ts'],
      },
      status: 'proposed',
      note: 'defer to agent',
    });
    expect(entry).toContain('## 2026-04-23 — add-dry-run-flag');
    expect(entry).toContain('제출: dong');
    expect(entry).toContain('카테고리: command-behavior');
    expect(entry).toContain('packages/cli/src/commands/ship.ts');
    expect(entry).toContain('상태: proposed');
    expect(entry).toContain('메모: defer to agent');
  });

  it('JSON-encodes the feedback quote (so line breaks do not corrupt the log)', () => {
    const entry = formatTuneLogEntry({
      date: '2026-04-23',
      shortDesc: 'x',
      user: 'u',
      feedback: 'multi\nline\n"quoted"',
      classification: {
        category: 'template',
        confidence: 0.3,
        rationale: 'r',
        candidate_targets: [],
      },
      status: 'deferred',
    });
    expect(entry).toContain('피드백 원문: "multi\\nline\\n\\"quoted\\""');
  });
});
