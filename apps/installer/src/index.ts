import { defineCommand, runMain } from 'citty';
import { scaffoldConductorDir } from '@conductor-kit/core';
import {
  installAgent,
  displayTarget,
  renderActionMark,
  type InstallAgentResult,
} from './agents.js';
import type { AgentId } from './paths.js';

const ALL_AGENTS: readonly AgentId[] = ['claude', 'codex', 'cursor'] as const;

function parseAgentSelection(value: string): AgentId[] {
  const v = value.trim().toLowerCase();
  if (v === 'all') return [...ALL_AGENTS];
  if (ALL_AGENTS.includes(v as AgentId)) return [v as AgentId];
  throw new Error(
    `[conductor-install] --agent must be one of: ${ALL_AGENTS.join(' | ')} | all (got "${value}")`,
  );
}

function defaultLabelFor(agents: AgentId[]): string | undefined {
  if (agents.length === 1) {
    return { claude: 'Claude Code', codex: 'Codex', cursor: 'Cursor' }[agents[0]!];
  }
  // `all` mode — caller should pass --label explicitly; otherwise we record
  // nothing and let `authorship_footer.fallback_agent` handle it at runtime.
  return undefined;
}

const main = defineCommand({
  meta: {
    name: 'conductor-install',
    description:
      'Install conductor-kit agent adapters (Claude / Codex / Cursor) into the current repository.',
  },
  args: {
    agent: {
      type: 'string',
      description: 'claude | codex | cursor | all',
      required: true,
    },
    label: {
      type: 'string',
      description:
        'Agent label recorded as default in .conductor/workflow.yml (appears in authorship footer)',
    },
    'project-key': {
      type: 'string',
      description: 'Jira project key to seed into .conductor/workflow.yml (e.g. ACME)',
    },
    'jira-url': {
      type: 'string',
      description: 'Jira base URL to seed into .conductor/workflow.yml',
    },
    cwd: {
      type: 'string',
      description: 'Host repository root (default: process.cwd())',
    },
    force: {
      type: 'boolean',
      description: 'Overwrite existing adapter files instead of skipping',
      default: false,
    },
    'dry-run': {
      type: 'boolean',
      description: 'Report what would change without touching the filesystem',
      default: false,
    },
    yes: {
      type: 'boolean',
      description: 'Reserved — currently unused; no interactive prompts yet',
      default: false,
    },
  },
  async run({ args }) {
    const cwd = (args.cwd as string | undefined) ?? process.cwd();
    const agents = parseAgentSelection(String(args.agent));
    const dryRun = Boolean(args['dry-run']);
    const force = Boolean(args.force);
    const label = (args.label as string | undefined) ?? defaultLabelFor(agents);

    const results: InstallAgentResult[] = [];
    for (const agent of agents) {
      results.push(
        await installAgent(agent, {
          cwd,
          dryRun,
          force,
          moduleUrl: import.meta.url,
        }),
      );
    }

    // Scaffold .conductor/ in the same run — the adapter is useless without
    // workflow.yml / CONVENTIONS.md seeds. Respect --force so re-running the
    // installer does not silently clobber user edits.
    const scaffold = dryRun
      ? null
      : await scaffoldConductorDir({
          cwd,
          projectKey: args['project-key'] as string | undefined,
          jiraBaseUrl: args['jira-url'] as string | undefined,
          agentLabel: label,
          force,
        });

    // --- Report ---
    console.log(
      `conductor-install  agent=${agents.join('+')}  label=${label ?? '(none)'}  cwd=${cwd}${dryRun ? '  [dry-run]' : ''}`,
    );
    for (const r of results) {
      console.log(`\n[${r.agent}]`);
      for (const f of r.files) {
        console.log(`  ${renderActionMark(f.action)}  ${displayTarget(f, cwd)}`);
      }
    }
    if (scaffold) {
      console.log(`\n[.conductor/]`);
      for (const f of scaffold.files) {
        const mark =
          f.action === 'written' ? 'wrote      ' : f.action === 'patched' ? 'patched    ' : 'skip-exist ';
        console.log(`  ${mark}  .conductor/${f.file}`);
      }
    } else {
      console.log(`\n[.conductor/]  (skipped in dry-run)`);
    }

    console.log(
      `\nNext:\n  1. Review .conductor/workflow.yml and fill in jira.* + gitlab.*\n  2. conductor pick <KEY>`,
    );
  },
});

runMain(main);
