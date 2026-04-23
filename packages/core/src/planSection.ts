/**
 * Extract the body text under a Markdown H2 heading whose title (after
 * leading hashes and optional whitespace) matches `heading` exactly.
 *
 * Returns an empty string when the heading is absent. Stops at the next
 * H2 / H3 or end-of-file.
 */
export function getH2Section(raw: string, heading: string): string {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    `##\\s*${escaped}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|\\n###\\s|\\n$)`,
  );
  return raw.match(re)?.[1] ?? '';
}

/**
 * Parse the plan's "영향 범위" (scope) section into a set of file paths or
 * path prefixes. Accepts bullet lines in a handful of shapes:
 *   - `src/foo/bar.ts`
 *   - `- src/foo/bar.ts`
 *   - `- \`src/foo/bar.ts\``
 *   - `- src/foo/**`  (glob — treated as a prefix)
 *   - `- src/foo/bar.ts — 이유`
 *
 * Free-form prose (file paths embedded inside sentences) is not parsed —
 * the convention is to list files as bullet entries.
 */
export function parsePlanScope(workRaw: string): string[] {
  const body = getH2Section(workRaw, '영향 범위');
  if (!body) return [];
  const items: string[] = [];
  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('<!--') || trimmed.startsWith('>')) continue;
    // strip leading `- ` / `* `, leading/trailing backticks
    let s = trimmed.replace(/^[-*]\s*/, '').replace(/^`|`$/g, '');
    // strip trailing "— reason" explanation
    s = s.replace(/\s+—\s+.*$/u, '').replace(/\s+-\s+.*$/u, '').trim();
    // keep only things that look like a file path (contain a slash OR end in a known ext)
    if (!s) continue;
    if (!s.includes('/') && !/\.[a-z0-9]{1,6}$/i.test(s)) continue;
    items.push(s);
  }
  return Array.from(new Set(items));
}

/**
 * Given a changed-files list and the plan's scope entries, return those
 * changed files that fall **outside** the scope. A scope entry matches if:
 *   - Exact path match, OR
 *   - Scope is a glob `prefix/**` or `prefix/*` — file starts with `prefix/`, OR
 *   - Scope is a directory path (no extension, ends with `/`) — file starts with it.
 */
export function findOutOfScope(
  changedFiles: readonly string[],
  scope: readonly string[],
): string[] {
  if (scope.length === 0) return [];
  return changedFiles.filter((f) => !scope.some((s) => matches(f, s)));
}

function matches(file: string, scopeEntry: string): boolean {
  if (file === scopeEntry) return true;
  if (scopeEntry.endsWith('/**') || scopeEntry.endsWith('/*')) {
    const prefix = scopeEntry.replace(/\/\*+$/, '/');
    return file.startsWith(prefix);
  }
  if (scopeEntry.endsWith('/')) return file.startsWith(scopeEntry);
  return false;
}
