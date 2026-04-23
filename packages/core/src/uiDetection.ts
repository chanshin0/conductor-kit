/**
 * Default globs that identify "UI surface area" changes. Repos override this
 * via `workflow.yml > ui.change_globs`. Kept permissive — matches any file
 * whose path begins with one of these prefixes.
 */
export const DEFAULT_UI_GLOBS: readonly string[] = [
  'src/views/**',
  'src/components/**',
  'src/assets/**',
  'src/locales/**',
];

/**
 * Check whether `files` contains at least one UI surface change matching
 * `globs`. Supports the common `prefix/**` form used across conductor-kit
 * config files; callers that need general glob semantics should pre-filter
 * with a real matcher.
 */
export function filesTouchUI(
  files: readonly string[],
  globs: readonly string[] = DEFAULT_UI_GLOBS,
): boolean {
  return files.some((f) => globs.some((g) => matchGlob(f, g)));
}

function matchGlob(path: string, glob: string): boolean {
  // Fast path: `prefix/**` means "any file under prefix/".
  if (glob.endsWith('/**')) {
    return path.startsWith(glob.slice(0, -3));
  }
  // Exact match.
  return path === glob;
}
