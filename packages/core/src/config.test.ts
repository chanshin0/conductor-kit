import { describe, expect, it } from 'vitest';
import { deepMerge } from './config.js';

describe('deepMerge', () => {
  it('overrides scalar values', () => {
    expect(deepMerge({ a: 1 }, { a: 2 })).toEqual({ a: 2 });
  });

  it('merges nested objects recursively', () => {
    const base = { jira: { base_url: '', transitions: { start: { from: 'TO DO' } } } };
    const override = { jira: { base_url: 'https://example.atlassian.net' } };
    expect(deepMerge(base, override)).toEqual({
      jira: {
        base_url: 'https://example.atlassian.net',
        transitions: { start: { from: 'TO DO' } },
      },
    });
  });

  it('replaces arrays instead of concatenating', () => {
    const base = { validation: { static: ['pnpm run lint', 'pnpm run test'] } };
    const override = { validation: { static: ['npm test'] } };
    expect(deepMerge(base, override)).toEqual({ validation: { static: ['npm test'] } });
  });

  it('returns base when override is null/undefined', () => {
    expect(deepMerge({ a: 1 }, null)).toEqual({ a: 1 });
    expect(deepMerge({ a: 1 }, undefined)).toEqual({ a: 1 });
  });
});
