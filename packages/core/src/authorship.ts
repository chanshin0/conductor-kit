import { execa } from 'execa';

export interface AuthorshipInputs {
  command: string;
  /** CLI `--agent` flag. Highest priority. */
  flagAgent?: string;
  /** `CONDUCTOR_AGENT` env. Second priority. */
  envAgent?: string;
  /** `.conductor/workflow.yml` → `agent.label`. Third priority. */
  configAgent?: string;
  /** `authorship_footer.fallback_agent` from config defaults. Last resort. */
  fallbackAgent?: string;
  cliVersion: string;
  user?: string;
}

export interface ResolvedAuthorship {
  command: string;
  agent: string;
  cli_version: string;
  user: string;
  /** Which rung of the ladder produced the `agent` value. */
  source: 'flag' | 'env' | 'config' | 'fallback';
}

/**
 * Resolve `{AGENT}` for the authorship footer through the 4-step ladder:
 *   1. --agent flag
 *   2. $CONDUCTOR_AGENT
 *   3. .conductor/workflow.yml `agent.label`
 *   4. authorship_footer.fallback_agent (default "unknown-agent")
 */
export function resolveAgent(
  inputs: Pick<AuthorshipInputs, 'flagAgent' | 'envAgent' | 'configAgent' | 'fallbackAgent'>,
): { agent: string; source: ResolvedAuthorship['source'] } {
  if (inputs.flagAgent && inputs.flagAgent.trim().length > 0) {
    return { agent: inputs.flagAgent.trim(), source: 'flag' };
  }
  if (inputs.envAgent && inputs.envAgent.trim().length > 0) {
    return { agent: inputs.envAgent.trim(), source: 'env' };
  }
  if (inputs.configAgent && inputs.configAgent.trim().length > 0) {
    return { agent: inputs.configAgent.trim(), source: 'config' };
  }
  return { agent: inputs.fallbackAgent?.trim() || 'unknown-agent', source: 'fallback' };
}

export async function detectGitUser(cwd = process.cwd()): Promise<string> {
  try {
    const { stdout } = await execa('git', ['config', 'user.name'], { cwd });
    return stdout.trim() || 'unknown-user';
  } catch {
    return 'unknown-user';
  }
}

export function resolveAuthorship(inputs: AuthorshipInputs): ResolvedAuthorship {
  const { agent, source } = resolveAgent(inputs);
  return {
    command: inputs.command,
    agent,
    cli_version: inputs.cliVersion,
    user: inputs.user?.trim() || 'unknown-user',
    source,
  };
}

/** Render the authorship footer by substituting placeholders in the config-defined format. */
export function renderAuthorshipFooter(
  format: string,
  ctx: Pick<ResolvedAuthorship, 'command' | 'agent' | 'cli_version' | 'user'>,
): string {
  return format
    .replace(/\{COMMAND\}/g, ctx.command)
    .replace(/\{AGENT\}/g, ctx.agent)
    .replace(/\{CLI_VERSION\}/g, ctx.cli_version)
    .replace(/\{USER\}/g, ctx.user);
}
