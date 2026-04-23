const BEGIN = '<!-- conductor-kit begin -->';
const END = '<!-- conductor-kit end -->';

export interface MergeResult {
  content: string;
  action: 'created' | 'section-added' | 'section-replaced' | 'noop';
}

/**
 * Merge a conductor-kit fragment into an AGENTS.md file, preserving
 * user-authored content outside the begin/end markers.
 *
 * - No existing file (original = null) → return the fragment wrapped with a
 *   banner so it reads as an intentional AGENTS.md ('created').
 * - Existing file without markers → append the fragment (which itself carries
 *   the markers) ('section-added').
 * - Existing file with markers → replace the marker section only; content
 *   before and after is untouched ('section-replaced').
 * - Existing file whose marker section already matches the fragment exactly
 *   → no-op ('noop').
 *
 * The `fragment` argument is expected to start with BEGIN and end with END
 * on their own lines — matching `packages/agent-codex/AGENTS.md.fragment`.
 */
export function mergeAgentsMd(original: string | null, fragment: string): MergeResult {
  if (!fragment.includes(BEGIN) || !fragment.includes(END)) {
    throw new Error(
      `[conductor-install] fragment is missing conductor-kit begin/end markers.`,
    );
  }

  const trimmedFragment = fragment.trim();

  if (original === null) {
    const header = '# AGENTS\n\n> This file aggregates AI-agent guidance for this repository.\n\n';
    return { content: header + trimmedFragment + '\n', action: 'created' };
  }

  const beginIdx = original.indexOf(BEGIN);
  const endIdx = original.indexOf(END);

  if (beginIdx === -1 || endIdx === -1) {
    const sep = original.endsWith('\n\n') ? '' : original.endsWith('\n') ? '\n' : '\n\n';
    return { content: original + sep + trimmedFragment + '\n', action: 'section-added' };
  }

  if (beginIdx > endIdx) {
    throw new Error(
      `[conductor-install] AGENTS.md contains begin/end markers in the wrong order.`,
    );
  }

  const before = original.slice(0, beginIdx);
  const existingSection = original.slice(beginIdx, endIdx + END.length);
  const after = original.slice(endIdx + END.length);

  if (existingSection.trim() === trimmedFragment) {
    return { content: original, action: 'noop' };
  }

  return {
    content: before + trimmedFragment + after,
    action: 'section-replaced',
  };
}
