import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { assetPath } from '@conductor-kit/assets';

const SEED_FILES = ['workflow.yml', 'CONVENTIONS.md', 'tune-log.md'] as const;

export interface ScaffoldOptions {
  cwd: string;
  projectKey?: string;
  jiraBaseUrl?: string;
  agentLabel?: string;
  force?: boolean;
}

export interface ScaffoldFileAction {
  file: string;
  action: 'written' | 'skipped-exists' | 'patched';
}

export interface ScaffoldResult {
  targetDir: string;
  files: ScaffoldFileAction[];
}

/** Substitute placeholders in the seed workflow.yml with values provided to the CLI. */
export function applyWorkflowPlaceholders(
  yaml: string,
  opts: Pick<ScaffoldOptions, 'projectKey' | 'jiraBaseUrl' | 'agentLabel'>,
): string {
  let out = yaml;
  if (opts.projectKey) {
    out = out.replace(/<YOUR_PROJECT_KEY>/g, opts.projectKey);
  }
  if (opts.jiraBaseUrl) {
    out = out.replace(/<YOUR_JIRA_BASE_URL>/g, opts.jiraBaseUrl);
  }
  if (opts.agentLabel) {
    // Append `agent:` block if not present; otherwise update the label line.
    if (/^agent:\s*$/m.test(out) || /^agent:\s*\n\s+label:/m.test(out)) {
      out = out.replace(/(^agent:\s*\n\s+label:\s*).*$/m, `$1'${opts.agentLabel}'`);
    } else {
      const suffix = `\nagent:\n  label: '${opts.agentLabel}'\n`;
      out = out.trimEnd() + '\n' + suffix;
    }
  }
  return out;
}

/** Copy seed files into <cwd>/.conductor and optionally inject user-provided values. */
export async function scaffoldConductorDir(opts: ScaffoldOptions): Promise<ScaffoldResult> {
  const target = join(opts.cwd, '.conductor');
  await mkdir(target, { recursive: true });

  const files: ScaffoldFileAction[] = [];
  for (const f of SEED_FILES) {
    const dst = join(target, f);
    const src = assetPath('workflow', 'seeds', f);
    if (existsSync(dst) && !opts.force) {
      files.push({ file: f, action: 'skipped-exists' });
      continue;
    }
    await copyFile(src, dst);
    files.push({ file: f, action: 'written' });
  }

  // Patch workflow.yml if any placeholder-injection flags were provided.
  if (opts.projectKey || opts.jiraBaseUrl || opts.agentLabel) {
    const wfPath = join(target, 'workflow.yml');
    const original = await readFile(wfPath, 'utf8');
    const patched = applyWorkflowPlaceholders(original, opts);
    if (patched !== original) {
      await writeFile(wfPath, patched, 'utf8');
      const existing = files.find((f) => f.file === 'workflow.yml');
      if (existing) existing.action = 'patched';
    }
  }

  return { targetDir: target, files };
}
