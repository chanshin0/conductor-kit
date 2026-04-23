import { describe, it, expect } from 'vitest';
import {
  renderTemplate,
  findRemainingPlaceholders,
  loadTemplate,
  renderTemplateFile,
} from './templates.js';

describe('renderTemplate', () => {
  it('substitutes {KEY} with provided values', () => {
    const out = renderTemplate('hello {NAME}, {NAME}!', { NAME: 'world' });
    expect(out).toBe('hello world, world!');
  });

  it('is case-sensitive (upper and lower can both occur)', () => {
    const out = renderTemplate('{FOO} {foo}', { FOO: 'A', foo: 'b' });
    expect(out).toBe('A b');
  });

  it('leaves unknown placeholders untouched', () => {
    const out = renderTemplate('{A} {B}', { A: '1' });
    expect(out).toBe('1 {B}');
  });

  it('does not substitute inside words or non-identifier patterns', () => {
    expect(renderTemplate('{1bad} {ok_name}', { ok_name: 'y' })).toBe('{1bad} y');
  });
});

describe('findRemainingPlaceholders', () => {
  it('collects unique identifier placeholders in sorted order (upper and lower)', () => {
    const s = '{MR_URL} {ISSUE_KEY} {mr_url} {MR_URL} {AGENT}';
    expect(findRemainingPlaceholders(s)).toEqual([
      'AGENT',
      'ISSUE_KEY',
      'MR_URL',
      'mr_url',
    ]);
  });

  it('ignores comment-style slots with non-identifier characters', () => {
    // Templates ship visual guides like `{background — 발견 경위·맥락}` — those
    // are for human readers, not for the renderer to fill.
    expect(
      findRemainingPlaceholders('{background — 발견 경위·맥락} {ok_name}'),
    ).toEqual(['ok_name']);
  });

  it('returns an empty list when none remain', () => {
    expect(findRemainingPlaceholders('fully rendered text')).toEqual([]);
  });
});

describe('loadTemplate + renderTemplateFile', () => {
  it('loads the shipped commit-message template from assets', async () => {
    const raw = await loadTemplate('commit-message');
    expect(raw).toContain('{TYPE}');
    expect(raw).toContain('{ISSUE_KEY}');
  });

  it('renders a real template end-to-end', async () => {
    const rendered = await renderTemplateFile('commit-message', {
      TYPE: 'feat',
      ISSUE_KEY: 'ACME-1',
      KOREAN_SUBJECT: '테스트 제목',
      OPTIONAL_BODY: '',
      JIRA_BASE_URL: 'https://example.atlassian.net',
    });
    expect(rendered).toContain('feat: ACME-1 테스트 제목');
    expect(rendered).toContain('https://example.atlassian.net/browse/ACME-1');
  });
});
