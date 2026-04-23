export type WorkStatus = 'plan-draft' | 'plan-approved' | 'implementing' | 'shipped' | 'landed';

export interface AuthorshipContext {
  command: string;
  agent: string;
  cli_version: string;
  user: string;
}

/**
 * The full, loaded workflow config. We keep this as a loose record for now —
 * the shape is documented in `@conductor-kit/assets/workflow/config.defaults.yml`
 * and will be tightened once the CLI surface stabilizes.
 */
export type WorkflowConfig = Record<string, unknown>;
