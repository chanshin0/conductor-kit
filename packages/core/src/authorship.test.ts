import { describe, expect, it } from 'vitest';
import { resolveAgent, renderAuthorshipFooter } from './authorship.js';

describe('resolveAgent (4-step ladder)', () => {
  it('prefers --agent flag', () => {
    const r = resolveAgent({
      flagAgent: 'Claude Opus',
      envAgent: 'env-one',
      configAgent: 'cfg-one',
      fallbackAgent: 'unknown-agent',
    });
    expect(r).toEqual({ agent: 'Claude Opus', source: 'flag' });
  });

  it('falls through to CONDUCTOR_AGENT env', () => {
    const r = resolveAgent({
      envAgent: 'Codex CLI',
      configAgent: 'cfg-one',
      fallbackAgent: 'unknown-agent',
    });
    expect(r).toEqual({ agent: 'Codex CLI', source: 'env' });
  });

  it('falls through to config agent.label', () => {
    const r = resolveAgent({
      configAgent: 'Cursor',
      fallbackAgent: 'unknown-agent',
    });
    expect(r).toEqual({ agent: 'Cursor', source: 'config' });
  });

  it('falls back to fallback_agent', () => {
    const r = resolveAgent({ fallbackAgent: 'unknown-agent' });
    expect(r).toEqual({ agent: 'unknown-agent', source: 'fallback' });
  });

  it('defaults fallback to "unknown-agent" when nothing is provided', () => {
    const r = resolveAgent({});
    expect(r).toEqual({ agent: 'unknown-agent', source: 'fallback' });
  });

  it('treats empty / whitespace-only flag values as absent', () => {
    const r = resolveAgent({
      flagAgent: '   ',
      envAgent: 'real-env',
      fallbackAgent: 'unknown-agent',
    });
    expect(r).toEqual({ agent: 'real-env', source: 'env' });
  });
});

describe('renderAuthorshipFooter', () => {
  const FORMAT =
    'Generated via `conductor {COMMAND}` — agent {AGENT} · conductor-kit v{CLI_VERSION} · user {USER}';

  it('substitutes every placeholder', () => {
    const out = renderAuthorshipFooter(FORMAT, {
      command: 'ship',
      agent: 'Claude Code',
      cli_version: '0.1.0',
      user: 'chanshin0',
    });
    expect(out).toBe(
      'Generated via `conductor ship` — agent Claude Code · conductor-kit v0.1.0 · user chanshin0',
    );
  });

  it('replaces every occurrence, not just the first', () => {
    const format = '{AGENT} saw {AGENT} again';
    expect(
      renderAuthorshipFooter(format, {
        command: 'x',
        agent: 'bot',
        cli_version: '0',
        user: 'u',
      }),
    ).toBe('bot saw bot again');
  });
});
