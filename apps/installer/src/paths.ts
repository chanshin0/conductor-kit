import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export type AgentId = 'claude' | 'codex' | 'cursor';

/**
 * Resolve the root directory for an agent adapter's source files.
 *
 * Resolution order:
 *   1. `<installer-dist>/adapters/<agent>` — adapters bundled at publish time
 *      (tsup publishes this layout for npm consumers).
 *   2. `<installer-source>/../../packages/agent-<agent>` — monorepo dev mode.
 *
 * Throws if neither layout is present. Callers can rely on the returned path
 * containing the files documented per-agent in `agents.ts`.
 */
export function resolveAdapterRoot(agent: AgentId, moduleUrl: string): string {
  const here = dirname(fileURLToPath(moduleUrl));

  const bundled = resolve(here, 'adapters', agent);
  if (existsSync(bundled)) return bundled;

  const monorepo = resolve(here, '..', '..', '..', 'packages', `agent-${agent}`);
  if (existsSync(monorepo)) return monorepo;

  throw new Error(
    `[conductor-install] Cannot locate adapter files for agent "${agent}".\n` +
      `  Looked at:\n` +
      `    ${bundled}\n` +
      `    ${monorepo}\n` +
      `  This is a packaging bug — please report it.`,
  );
}

export function hostRepoPath(cwd: string, ...segments: string[]): string {
  return join(cwd, ...segments);
}
