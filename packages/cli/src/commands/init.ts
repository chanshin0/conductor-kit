import { defineCommand } from 'citty';
import { globalArgs } from '../global-args.js';
import { scaffoldConductorDir } from '@conductor-kit/core';
import { emitHandoff } from '../io.js';

export const initCommand = defineCommand({
  meta: { description: 'Scaffold .conductor/ in the current repository' },
  args: {
    ...globalArgs,
    'project-key': {
      type: 'string',
      description: 'Jira project key (e.g. ACME)',
    },
    label: {
      type: 'string',
      description: 'Agent label recorded as default in .conductor/workflow.yml',
    },
    'jira-url': {
      type: 'string',
      description: 'Jira base URL (e.g. https://your-org.atlassian.net)',
    },
    force: {
      type: 'boolean',
      description: 'Overwrite existing .conductor/ files',
      default: false,
    },
  },
  async run({ args }) {
    const cwd = (args.cwd as string | undefined) ?? process.cwd();
    const result = await scaffoldConductorDir({
      cwd,
      projectKey: args['project-key'] as string | undefined,
      jiraBaseUrl: args['jira-url'] as string | undefined,
      agentLabel: args.label as string | undefined,
      force: Boolean(args.force),
    });

    if (args.json) {
      emitHandoff({
        status: 'ok',
        phase: 'init/complete',
        data: { target_dir: result.targetDir, files: result.files },
        handoff: { next_cmd: 'conductor pick <KEY>' },
      });
      return;
    }

    console.log(`conductor init → ${result.targetDir}`);
    for (const f of result.files) {
      const mark =
        f.action === 'written' ? 'wrote ' : f.action === 'patched' ? 'patched' : 'skip  ';
      console.log(`  ${mark}  ${f.file}`);
    }
    console.log('\nNext: edit .conductor/workflow.yml then run `conductor pick <ISSUE-KEY>`.');
  },
});
