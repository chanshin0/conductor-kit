import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';
import { assetPath } from '@conductor-kit/assets';

const DEFAULTS_PATH = assetPath('workflow', 'config.defaults.yml');

export type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;

/** Deep-merge two plain objects. Arrays are replaced, not merged. */
export function deepMerge<T>(base: T, override: DeepPartial<T> | undefined | null): T {
  if (override == null) return base;
  if (typeof base !== 'object' || base === null) return (override as T) ?? base;
  if (typeof override !== 'object' || Array.isArray(override)) return override as T;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(override as Record<string, unknown>)) {
    const current = (base as Record<string, unknown>)[k];
    if (
      v !== null &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      current !== null &&
      typeof current === 'object' &&
      !Array.isArray(current)
    ) {
      out[k] = deepMerge(current, v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

export interface LoadConfigOptions {
  cwd?: string;
  overridePath?: string;
}

/** Load repo-agnostic defaults from @conductor-kit/assets and deep-merge the host override. */
export async function loadConfig(
  options: LoadConfigOptions = {},
): Promise<Record<string, unknown>> {
  const cwd = options.cwd ?? process.cwd();
  const defaultsText = await readFile(DEFAULTS_PATH, 'utf8');
  const defaults = YAML.parse(defaultsText) as Record<string, unknown>;
  const overridePath = options.overridePath ?? join(cwd, '.conductor', 'workflow.yml');
  if (!existsSync(overridePath)) return defaults;
  const overrideText = await readFile(overridePath, 'utf8');
  const override = YAML.parse(overrideText) as Record<string, unknown> | null;
  return deepMerge(defaults, override);
}
