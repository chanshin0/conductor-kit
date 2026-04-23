import { describe, it, expect } from 'vitest';
import { parseGitRemote, buildPrefillUrl } from './gitlab.js';

describe('parseGitRemote', () => {
  it('parses git@ SSH remotes with .git suffix', () => {
    const r = parseGitRemote('git@gitlab.example.com:group/project.git');
    expect(r).toEqual({ baseUrl: 'https://gitlab.example.com', projectPath: 'group/project' });
  });

  it('parses git@ SSH remotes without .git suffix', () => {
    const r = parseGitRemote('git@gitlab.example.com:team/sub/repo');
    expect(r).toEqual({ baseUrl: 'https://gitlab.example.com', projectPath: 'team/sub/repo' });
  });

  it('parses https remotes with .git suffix', () => {
    const r = parseGitRemote('https://gitlab.example.com/group/project.git');
    expect(r).toEqual({ baseUrl: 'https://gitlab.example.com', projectPath: 'group/project' });
  });

  it('parses https remotes on non-standard ports', () => {
    const r = parseGitRemote('https://gitlab.example.com:8443/group/project.git');
    expect(r).toEqual({
      baseUrl: 'https://gitlab.example.com:8443',
      projectPath: 'group/project',
    });
  });

  it('returns null for unrecognised formats', () => {
    expect(parseGitRemote('file:///local/repo.git')).toBeNull();
    expect(parseGitRemote('some-local-name')).toBeNull();
    expect(parseGitRemote('')).toBeNull();
  });
});

describe('buildPrefillUrl', () => {
  it('produces an encoded MR creation URL', () => {
    const url = buildPrefillUrl({
      baseUrl: 'https://gitlab.example.com',
      projectPath: 'group/project',
      sourceBranch: 'feat/ACME-1-foo bar',
      targetBranch: 'main',
      title: 'feat: ACME-1 & spaces',
      description: '# body\n* item 1\n* item 2',
    });

    expect(url.startsWith('https://gitlab.example.com/group/project/-/merge_requests/new?')).toBe(
      true,
    );
    expect(url).toContain('merge_request%5Bsource_branch%5D=feat%2FACME-1-foo+bar');
    expect(url).toContain('merge_request%5Btarget_branch%5D=main');
    expect(url).toContain('merge_request%5Btitle%5D=feat%3A+ACME-1+%26+spaces');
  });

  it('strips trailing slashes from base, leading/trailing from project', () => {
    const url = buildPrefillUrl({
      baseUrl: 'https://gitlab.example.com/',
      projectPath: '/group/project/',
      sourceBranch: 's',
      targetBranch: 't',
      title: 'x',
      description: '',
    });
    expect(
      url.startsWith('https://gitlab.example.com/group/project/-/merge_requests/new?'),
    ).toBe(true);
  });
});
