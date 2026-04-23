import { describe, expect, it } from 'vitest';
import { parseStatus, assertShippable } from './work.js';

describe('parseStatus', () => {
  it('reads status from a "- status: plan-draft" list bullet', () => {
    const raw = '## 메타\n- status: plan-draft\n- branch: feat/X-1\n';
    expect(parseStatus(raw)).toBe('plan-draft');
  });

  it('reads status from "status: plan-approved" key-value', () => {
    expect(parseStatus('status: plan-approved\n')).toBe('plan-approved');
  });

  it('falls back to plan-draft when nothing matches', () => {
    expect(parseStatus('just text, no status field')).toBe('plan-draft');
  });

  it('rejects unknown status values (falls back)', () => {
    expect(parseStatus('status: not-a-real-status')).toBe('plan-draft');
  });
});

describe('assertShippable', () => {
  it('throws when no work file', () => {
    expect(() => assertShippable(null)).toThrow(/No work file found/);
  });

  it('throws when status is plan-draft', () => {
    expect(() => assertShippable({ issue_key: 'X-1', status: 'plan-draft', raw: '' })).toThrow(
      /plan-draft.*plan-approved/,
    );
  });

  it('passes when plan-approved', () => {
    expect(() =>
      assertShippable({ issue_key: 'X-1', status: 'plan-approved', raw: '' }),
    ).not.toThrow();
  });

  it('passes when implementing', () => {
    expect(() =>
      assertShippable({ issue_key: 'X-1', status: 'implementing', raw: '' }),
    ).not.toThrow();
  });
});
