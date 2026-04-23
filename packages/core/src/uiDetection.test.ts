import { describe, it, expect } from 'vitest';
import { filesTouchUI, DEFAULT_UI_GLOBS } from './uiDetection.js';

describe('filesTouchUI', () => {
  it('matches files under default UI globs', () => {
    expect(filesTouchUI(['src/views/home.vue'])).toBe(true);
    expect(filesTouchUI(['src/components/Table.tsx'])).toBe(true);
    expect(filesTouchUI(['src/assets/logo.svg'])).toBe(true);
    expect(filesTouchUI(['src/locales/en.json'])).toBe(true);
  });

  it('returns false when no files match', () => {
    expect(filesTouchUI(['src/stores/user.ts', 'README.md'])).toBe(false);
  });

  it('returns false on empty input', () => {
    expect(filesTouchUI([])).toBe(false);
  });

  it('respects a custom glob list', () => {
    expect(filesTouchUI(['apps/web/pages/index.tsx'], ['apps/web/pages/**'])).toBe(true);
    expect(filesTouchUI(['apps/web/pages/index.tsx'], ['apps/web/api/**'])).toBe(false);
  });

  it('short-circuits on the first match', () => {
    const many = Array.from({ length: 1000 }, (_, i) => `src/stores/s${i}.ts`);
    many.push('src/views/hit.vue');
    expect(filesTouchUI(many)).toBe(true);
  });

  it('DEFAULT_UI_GLOBS is an opinionated sensible default', () => {
    // Guard against accidental deletion of the catch-all globs.
    expect(DEFAULT_UI_GLOBS).toContain('src/views/**');
    expect(DEFAULT_UI_GLOBS).toContain('src/components/**');
  });
});
