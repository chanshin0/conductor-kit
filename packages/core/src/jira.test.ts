import { describe, expect, it } from 'vitest';
import { normalizeIssue, AcliMissingError, JiraApiError, JIRA_EXIT } from './jira.js';

describe('normalizeIssue', () => {
  it('extracts the common fields from an acli-shaped payload', () => {
    const raw = {
      key: 'ACME-42',
      fields: {
        summary: 'Fix login redirect',
        issuetype: { name: 'Bug' },
        status: { name: 'To Do' },
        priority: { name: 'High' },
        assignee: { displayName: 'Dana' },
        reporter: { displayName: 'Sam' },
        description: 'Users land on /home',
      },
    };
    const out = normalizeIssue(raw, 'ACME-42');
    expect(out.key).toBe('ACME-42');
    expect(out.type).toBe('Bug');
    expect(out.summary).toBe('Fix login redirect');
    expect(out.status).toBe('To Do');
    expect(out.priority).toBe('High');
    expect(out.assignee).toBe('Dana');
    expect(out.reporter).toBe('Sam');
    expect(out.description).toBe('Users land on /home');
  });

  it('uses fallback key and sensible defaults when fields are missing', () => {
    const out = normalizeIssue({}, 'XYZ-1');
    expect(out.key).toBe('XYZ-1');
    expect(out.type).toBe('Task');
    expect(out.status).toBe('Unknown');
    expect(out.summary).toBe('');
    expect(out.priority).toBeUndefined();
  });
});

describe('error classes', () => {
  it('AcliMissingError carries exit code 10', () => {
    const e = new AcliMissingError();
    expect(e.code).toBe(JIRA_EXIT.ACLI_MISSING);
    expect(e.message).toMatch(/acli/);
  });

  it('JiraApiError carries exit code 20 and retains stderr', () => {
    const e = new JiraApiError('boom', 'stderr text');
    expect(e.code).toBe(JIRA_EXIT.API_FAILURE);
    expect(e.stderr).toBe('stderr text');
  });
});
