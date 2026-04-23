import { describe, expect, it } from 'vitest';
import { renderPickWorkFile, pickCommitType } from './pick.js';

describe('pickCommitType', () => {
  it('maps by issue type', () => {
    expect(pickCommitType('Bug', { Bug: 'fix', Task: 'feat' })).toBe('fix');
    expect(pickCommitType('Task', { Bug: 'fix', Task: 'feat' })).toBe('feat');
  });

  it('falls back to feat when type or map is missing', () => {
    expect(pickCommitType('Unknown', { Bug: 'fix' })).toBe('feat');
    expect(pickCommitType('Bug', undefined)).toBe('feat');
  });
});

describe('renderPickWorkFile', () => {
  const issue = {
    key: 'ACME-42',
    type: 'Bug',
    summary: 'Fix login redirect',
    status: 'To Do',
    priority: 'High',
    assignee: 'Dana',
    reporter: 'Sam',
    description: 'Users land on /home',
    raw: {},
  };

  it('includes the lifecycle meta block with plan-draft status', () => {
    const out = renderPickWorkFile({
      issue,
      branch: 'fix/ACME-42-fix-login-redirect',
      jiraBaseUrl: 'https://acme.atlassian.net',
      now: '2026-04-23T00:00:00.000Z',
    });
    expect(out).toMatch(/# ACME-42 — Fix login redirect/);
    expect(out).toMatch(/status: plan-draft/);
    expect(out).toMatch(/branch: fix\/ACME-42-fix-login-redirect/);
    expect(out).toMatch(/created: 2026-04-23T00:00:00\.000Z/);
    expect(out).toMatch(/Link: https:\/\/acme\.atlassian\.net\/browse\/ACME-42/);
  });

  it('substitutes "-" for missing optional fields', () => {
    const minimal = {
      ...issue,
      priority: undefined,
      assignee: undefined,
      reporter: undefined,
      description: undefined,
    };
    const out = renderPickWorkFile({
      issue: minimal,
      branch: 'x',
      jiraBaseUrl: 'y',
      now: 't',
    });
    expect(out).toMatch(/- Priority: -/);
    expect(out).toMatch(/- Assignee: -/);
    expect(out).toMatch(/\(empty\)/);
  });
});
