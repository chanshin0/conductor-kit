import { describe, expect, it } from 'vitest';
import { applyWorkflowPlaceholders } from './scaffold.js';

const SEED = `project_key: '<YOUR_PROJECT_KEY>'

jira:
  base_url: '<YOUR_JIRA_BASE_URL>'
`;

describe('applyWorkflowPlaceholders', () => {
  it('substitutes project key and jira url', () => {
    const out = applyWorkflowPlaceholders(SEED, {
      projectKey: 'ACME',
      jiraBaseUrl: 'https://acme.atlassian.net',
    });
    expect(out).toContain("project_key: 'ACME'");
    expect(out).toContain("base_url: 'https://acme.atlassian.net'");
    expect(out).not.toContain('<YOUR_PROJECT_KEY>');
    expect(out).not.toContain('<YOUR_JIRA_BASE_URL>');
  });

  it('appends agent block when not present', () => {
    const out = applyWorkflowPlaceholders(SEED, { agentLabel: 'Claude Code' });
    expect(out).toMatch(/agent:\s*\n\s+label:\s*'Claude Code'/);
  });

  it('updates existing agent label line', () => {
    const withAgent = SEED + `\nagent:\n  label: 'old-value'\n`;
    const out = applyWorkflowPlaceholders(withAgent, { agentLabel: 'Cursor' });
    expect(out).toContain("label: 'Cursor'");
    expect(out).not.toContain("'old-value'");
  });

  it('is a no-op when no options provided', () => {
    expect(applyWorkflowPlaceholders(SEED, {})).toBe(SEED);
  });
});
