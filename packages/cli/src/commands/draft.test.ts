import { describe, it, expect } from 'vitest';
import { extractKeywords, buildJql } from './draft.js';

describe('extractKeywords', () => {
  it('drops stopwords and short tokens, preserves order, dedupes', () => {
    const kws = extractKeywords('The auth middleware fails for a few tenants');
    expect(kws).toEqual(['auth', 'middleware', 'fails', 'few', 'tenants']);
  });

  it('caps at `max`', () => {
    const kws = extractKeywords('one two three four five six seven eight', 3);
    expect(kws).toHaveLength(3);
  });

  it('handles Korean descriptions (stopwords + punctuation)', () => {
    const kws = extractKeywords(
      '이미지 레이어링 유효성 검사가 조건별로 다르게 동작함.',
    );
    // "이미지", "레이어링", "유효성", "검사가", "조건별로", "다르게", "동작함"
    // Korean particles like 가/로 are attached inside words here, so we expect
    // the words as tokens (stopword list catches 은/는/이/가 only when they are
    // separate tokens — an acceptable limitation for a deterministic baseline).
    expect(kws.length).toBeGreaterThan(0);
    expect(kws).toContain('이미지');
    expect(kws).toContain('레이어링');
  });

  it('returns an empty list for an empty string', () => {
    expect(extractKeywords('')).toEqual([]);
  });
});

describe('buildJql', () => {
  it('includes project and OR-joined keyword text search', () => {
    const jql = buildJql('ACME', ['auth', 'middleware']);
    expect(jql).toBe(
      'project = ACME AND text ~ ("auth" OR "middleware") ORDER BY created DESC',
    );
  });

  it('falls back to project-only when there are no keywords', () => {
    expect(buildJql('ACME', [])).toBe('project = ACME ORDER BY created DESC');
  });

  it('escapes quotes in keywords', () => {
    const jql = buildJql('ACME', ['a"b']);
    expect(jql).toContain('"a\\"b"');
  });
});
