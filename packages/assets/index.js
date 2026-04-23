import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

/** Absolute path to this package's root. Consumers can resolve template / reference files relative to this. */
export const assetsRoot = here;

export function assetPath(...segments) {
  return join(here, ...segments);
}
