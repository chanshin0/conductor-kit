import { readFile } from 'node:fs/promises';
import { assetPath } from '@conductor-kit/assets';

/**
 * Registered template names — one per file under
 * `@conductor-kit/assets/workflow/templates/`.
 *
 * Keeping this as a closed union lets TypeScript catch typos at call sites
 * without forcing callers to know the `.md` filename.
 */
export type TemplateName =
  | 'commit-message'
  | 'mr-template'
  | 'jira-comment-ship'
  | 'recap-comment'
  | 'recap-page'
  | 'draft-issue'
  | 'plan-template'
  | 'work-context';

export type PlaceholderValues = Record<string, string>;

/**
 * Render a template by substituting `{KEY}` placeholders with the given
 * values. Case is preserved — if a template has both `{ISSUE_KEY}` and
 * `{issue_key}`, pass both in `values`.
 *
 * Unknown placeholders are left in place — this is intentional so that a
 * multi-pass rendering (per phase) can add values incrementally without
 * losing the unrendered slots.
 */
export function renderTemplate(content: string, values: PlaceholderValues): string {
  return content.replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (match, key: string) => {
    if (key in values) return values[key]!;
    return match;
  });
}

/** Read a template file from the shipped `@conductor-kit/assets` package. */
export async function loadTemplate(name: TemplateName): Promise<string> {
  const path = assetPath('workflow', 'templates', `${name}.md`);
  return readFile(path, 'utf8');
}

/** Load + render in a single call. */
export async function renderTemplateFile(
  name: TemplateName,
  values: PlaceholderValues,
): Promise<string> {
  const raw = await loadTemplate(name);
  return renderTemplate(raw, values);
}

/**
 * Return the list of placeholders *still unrendered* in a string.
 *
 * Matches both `{UPPER_SNAKE}` and `{lower_snake}` forms — conductor's
 * templates mix the two (headers like `{COMMAND}` / `{AGENT}` alongside
 * content slots like `{mr_url}` / `{goal_one_liner}`). Identifier-style
 * only: `{background — 발견 경위·맥락}` and similar comment-style slots
 * are intentionally ignored so templates can keep visual guides.
 *
 * Useful for `ship` / `recap` to assert that every required slot has been
 * filled before posting to Jira / creating the MR.
 */
export function findRemainingPlaceholders(content: string): string[] {
  const set = new Set<string>();
  const re = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content)) !== null) {
    set.add(match[1]!);
  }
  return [...set].sort();
}
