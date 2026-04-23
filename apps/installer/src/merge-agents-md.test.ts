import { describe, it, expect } from 'vitest';
import { mergeAgentsMd } from './merge-agents-md.js';

const FRAGMENT = `<!-- conductor-kit begin -->
## conductor-kit workflow
conductor is installed.
<!-- conductor-kit end -->`;

describe('mergeAgentsMd', () => {
  it('creates AGENTS.md with a banner when original is null', () => {
    const r = mergeAgentsMd(null, FRAGMENT);
    expect(r.action).toBe('created');
    expect(r.content.startsWith('# AGENTS')).toBe(true);
    expect(r.content).toContain('<!-- conductor-kit begin -->');
    expect(r.content).toContain('<!-- conductor-kit end -->');
  });

  it('appends the fragment when existing file has no markers', () => {
    const existing = '# AGENTS\n\nTeam rules live here.\n';
    const r = mergeAgentsMd(existing, FRAGMENT);
    expect(r.action).toBe('section-added');
    expect(r.content.startsWith('# AGENTS')).toBe(true);
    expect(r.content).toContain('Team rules live here.');
    expect(r.content).toContain('<!-- conductor-kit begin -->');
  });

  it('replaces only the marker section, preserving surrounding content', () => {
    const existing =
      '# AGENTS\n\nKeep this top content.\n\n' +
      '<!-- conductor-kit begin -->\nOLD CONDUCTOR CONTENT\n<!-- conductor-kit end -->\n\n' +
      '## My team rules\nKeep this bottom content too.\n';
    const r = mergeAgentsMd(existing, FRAGMENT);
    expect(r.action).toBe('section-replaced');
    expect(r.content).toContain('Keep this top content.');
    expect(r.content).toContain('Keep this bottom content too.');
    expect(r.content).toContain('conductor is installed.');
    expect(r.content).not.toContain('OLD CONDUCTOR CONTENT');
  });

  it('is a no-op when the marker section already matches', () => {
    const existing = `# AGENTS\n\n${FRAGMENT}\n`;
    const r = mergeAgentsMd(existing, FRAGMENT);
    expect(r.action).toBe('noop');
    expect(r.content).toBe(existing);
  });

  it('rejects fragments without markers', () => {
    expect(() => mergeAgentsMd(null, 'no markers here')).toThrow(/markers/);
  });

  it('rejects inverted markers', () => {
    const inverted =
      '# AGENTS\n<!-- conductor-kit end -->\nweird\n<!-- conductor-kit begin -->\n';
    expect(() => mergeAgentsMd(inverted, FRAGMENT)).toThrow(/wrong order/);
  });
});
