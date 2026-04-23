import type { ArgsDef } from 'citty';

/** Shared by every subcommand. Subcommands extend this with their own args. */
export const globalArgs = {
  json: {
    type: 'boolean',
    description: 'Structured JSON output; prompts exchanged via stdin JSON',
    default: false,
  },
  auto: {
    type: 'boolean',
    description: 'Take the default for every prompt (autopilot / ralph)',
    default: false,
  },
  yes: {
    type: 'boolean',
    description: 'Auto-confirm destructive prompts only',
    default: false,
  },
  agent: {
    type: 'string',
    description: 'Agent label injected into the authorship footer',
  },
  cwd: {
    type: 'string',
    description: 'Repository root (default: process.cwd())',
  },
  config: {
    type: 'string',
    description: 'Path to host workflow.yml override (default: .conductor/workflow.yml)',
  },
} satisfies ArgsDef;

export type GlobalArgs = {
  json: boolean;
  auto: boolean;
  yes: boolean;
  agent?: string;
  cwd?: string;
  config?: string;
};
