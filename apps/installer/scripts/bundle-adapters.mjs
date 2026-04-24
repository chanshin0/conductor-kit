#!/usr/bin/env node
// Copy the three agent adapters into `dist/adapters/<agent>/` so the
// published npm package ships every file `src/paths.ts` + `src/agents.ts`
// expect to find at install time. Monorepo dev still resolves via the
// fallback path in `paths.ts` — this script only matters for `npm pack`
// and `npm publish`.

import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const installerRoot = resolve(here, '..');
const repoRoot = resolve(installerRoot, '..', '..');
const distAdapters = resolve(installerRoot, 'dist', 'adapters');

/** Files we never ship — package metadata + docs belong to the source tree. */
const EXCLUDE = new Set(['package.json', 'README.md', 'node_modules']);

const AGENTS = [
  { id: 'claude', source: resolve(repoRoot, 'packages', 'agent-claude') },
  { id: 'codex', source: resolve(repoRoot, 'packages', 'agent-codex') },
  { id: 'cursor', source: resolve(repoRoot, 'packages', 'agent-cursor') },
];

async function assertExists(path) {
  try {
    await stat(path);
  } catch {
    throw new Error(`[bundle-adapters] expected source path missing: ${path}`);
  }
}

async function main() {
  await rm(distAdapters, { recursive: true, force: true });
  await mkdir(distAdapters, { recursive: true });

  for (const { id, source } of AGENTS) {
    await assertExists(source);
    const target = resolve(distAdapters, id);
    await cp(source, target, {
      recursive: true,
      filter: (src) => {
        const base = src.split('/').pop();
        return !EXCLUDE.has(base);
      },
    });
    process.stdout.write(`bundled adapter: ${id}\n`);
  }
}

main().catch((err) => {
  process.stderr.write(`[bundle-adapters] ${err.message}\n`);
  process.exitCode = 1;
});
