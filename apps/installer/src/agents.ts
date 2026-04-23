import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { resolveAdapterRoot, hostRepoPath, type AgentId } from './paths.js';
import { mergeAgentsMd } from './merge-agents-md.js';

export type FileAction =
  | 'written'
  | 'overwritten'
  | 'skipped-exists'
  | 'would-write'
  | 'would-overwrite'
  | 'would-skip'
  | 'merged'
  | 'would-merge'
  | 'noop';

export interface InstallFile {
  source: string;
  target: string;
  action: FileAction;
}

export interface InstallAgentOptions {
  cwd: string;
  force: boolean;
  dryRun: boolean;
  /** ESM `import.meta.url` from index.ts — used to resolve adapter paths. */
  moduleUrl: string;
}

export interface InstallAgentResult {
  agent: AgentId;
  files: InstallFile[];
}

async function listMd(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return [];
  const names = await readdir(dir);
  return names.filter((n) => n.endsWith('.md') || n.endsWith('.mdc')).sort();
}

/** Write `content` to `target` respecting the force / dryRun mix. */
async function writeFileGuarded(
  target: string,
  content: string,
  opts: { force: boolean; dryRun: boolean },
): Promise<FileAction> {
  const exists = existsSync(target);
  if (exists && !opts.force) {
    return opts.dryRun ? 'would-skip' : 'skipped-exists';
  }
  if (opts.dryRun) {
    return exists ? 'would-overwrite' : 'would-write';
  }
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content, 'utf8');
  return exists ? 'overwritten' : 'written';
}

async function copyFileGuarded(
  source: string,
  target: string,
  opts: { force: boolean; dryRun: boolean },
): Promise<FileAction> {
  const content = await readFile(source, 'utf8');
  return writeFileGuarded(target, content, opts);
}

async function installClaude(opts: InstallAgentOptions): Promise<InstallFile[]> {
  const root = resolveAdapterRoot('claude', opts.moduleUrl);
  const sourceDir = join(root, 'commands');
  const names = await listMd(sourceDir);
  const files: InstallFile[] = [];
  for (const name of names) {
    const source = join(sourceDir, name);
    // Prefix with `conductor-` so flat-install commands don't collide with
    // user-authored slash commands (e.g. `/pick`). Marketplace plugin
    // installs — which surface as `/conductor:pick` — are a separate path.
    const target = hostRepoPath(opts.cwd, '.claude', 'commands', `conductor-${name}`);
    const action = await copyFileGuarded(source, target, opts);
    files.push({ source, target, action });
  }
  return files;
}

async function installCodex(opts: InstallAgentOptions): Promise<InstallFile[]> {
  const root = resolveAdapterRoot('codex', opts.moduleUrl);
  const files: InstallFile[] = [];

  // 1. Copy prompts (already named `conductor-*.md`).
  const promptDir = join(root, 'prompts');
  for (const name of await listMd(promptDir)) {
    const source = join(promptDir, name);
    const target = hostRepoPath(opts.cwd, '.codex', 'prompts', name);
    const action = await copyFileGuarded(source, target, opts);
    files.push({ source, target, action });
  }

  // 2. Merge AGENTS.md fragment at host-repo root.
  const fragmentPath = join(root, 'AGENTS.md.fragment');
  const fragment = await readFile(fragmentPath, 'utf8');
  const agentsMdPath = hostRepoPath(opts.cwd, 'AGENTS.md');
  const existing = existsSync(agentsMdPath) ? await readFile(agentsMdPath, 'utf8') : null;
  const merged = mergeAgentsMd(existing, fragment);

  let action: FileAction;
  if (merged.action === 'noop') {
    action = 'noop';
  } else if (opts.dryRun) {
    action = 'would-merge';
  } else {
    await mkdir(dirname(agentsMdPath), { recursive: true });
    await writeFile(agentsMdPath, merged.content, 'utf8');
    action = 'merged';
  }
  files.push({ source: fragmentPath, target: agentsMdPath, action });

  return files;
}

async function installCursor(opts: InstallAgentOptions): Promise<InstallFile[]> {
  const root = resolveAdapterRoot('cursor', opts.moduleUrl);
  const files: InstallFile[] = [];

  const rulesDir = join(root, '.cursor', 'rules');
  for (const name of await listMd(rulesDir)) {
    const source = join(rulesDir, name);
    const target = hostRepoPath(opts.cwd, '.cursor', 'rules', name);
    const action = await copyFileGuarded(source, target, opts);
    files.push({ source, target, action });
  }

  const commandsDir = join(root, '.cursor', 'commands');
  for (const name of await listMd(commandsDir)) {
    const source = join(commandsDir, name);
    const target = hostRepoPath(opts.cwd, '.cursor', 'commands', name);
    const action = await copyFileGuarded(source, target, opts);
    files.push({ source, target, action });
  }

  return files;
}

const INSTALLERS: Record<AgentId, (o: InstallAgentOptions) => Promise<InstallFile[]>> = {
  claude: installClaude,
  codex: installCodex,
  cursor: installCursor,
};

export async function installAgent(
  agent: AgentId,
  opts: InstallAgentOptions,
): Promise<InstallAgentResult> {
  const files = await INSTALLERS[agent](opts);
  return { agent, files };
}

export function renderActionMark(action: FileAction): string {
  switch (action) {
    case 'written':
      return 'wrote      ';
    case 'overwritten':
      return 'overwrote  ';
    case 'skipped-exists':
      return 'skip-exist ';
    case 'would-write':
      return 'would-write';
    case 'would-overwrite':
      return 'would-over ';
    case 'would-skip':
      return 'would-skip ';
    case 'merged':
      return 'merged     ';
    case 'would-merge':
      return 'would-merge';
    case 'noop':
      return 'noop       ';
  }
}

/** Surface names used in CLI output. */
export function displayTarget(file: InstallFile, cwd: string): string {
  return file.target.startsWith(cwd + '/') ? file.target.slice(cwd.length + 1) : file.target;
}

