import { describe, expect, it } from 'vitest';
import { slugify, buildBranchName } from './git.js';

describe('slugify', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(slugify('Hello World From Conductor')).toBe('hello-world-from-conductor');
  });

  it('caps at max_words', () => {
    expect(slugify('one two three four five six seven', 3)).toBe('one-two-three');
  });

  it('strips punctuation', () => {
    expect(slugify('Fix: broken auth (CVE-1234)')).toBe('fix-broken-auth-cve-1234');
  });

  it('respects custom separator', () => {
    expect(slugify('two words', 5, '_')).toBe('two_words');
  });
});

describe('buildBranchName', () => {
  it('composes {type}/{issue_key}-{slug}', () => {
    expect(
      buildBranchName({
        type: 'feat',
        issue_key: 'PROJ-123',
        subject: 'Add conductor init command',
      }),
    ).toBe('feat/PROJ-123-add-conductor-init-command');
  });

  it('applies max_words', () => {
    expect(
      buildBranchName({
        type: 'fix',
        issue_key: 'X-1',
        subject: 'one two three four five six',
        max_words: 3,
      }),
    ).toBe('fix/X-1-one-two-three');
  });
});
