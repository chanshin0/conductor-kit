import { describe, it, expect } from 'vitest';
import { getH2Section, parsePlanScope, findOutOfScope } from './planSection.js';

const PLAN = `# ACME-1

## 목표

- 풀 생성 모달에서 블롭 크기 자동 승격

## 영향 범위

- \`src/components/PoolCreateModal.vue\`
- src/composables/pool/usePoolForm.ts — 숫자 입력 핸들러
- src/utils/units/**
- docs/pool-guide.md

## 테스트 전략

- lint / type-check / test
`;

describe('getH2Section', () => {
  it('returns the body of a named H2 without the heading', () => {
    const body = getH2Section(PLAN, '목표');
    expect(body).toContain('블롭 크기 자동 승격');
    expect(body).not.toContain('## 목표');
  });

  it('returns empty string for an absent heading', () => {
    expect(getH2Section(PLAN, '존재하지 않음')).toBe('');
  });
});

describe('parsePlanScope', () => {
  it('parses bullet file paths, strips backticks and trailing reasons', () => {
    const scope = parsePlanScope(PLAN);
    expect(scope).toEqual([
      'src/components/PoolCreateModal.vue',
      'src/composables/pool/usePoolForm.ts',
      'src/utils/units/**',
      'docs/pool-guide.md',
    ]);
  });

  it('returns [] when the section is missing', () => {
    expect(parsePlanScope('no plan here')).toEqual([]);
  });

  it('skips HTML comments and block quotes inside the section', () => {
    const raw =
      '## 영향 범위\n\n<!-- guidance -->\n> aside\n- src/a.ts\n';
    expect(parsePlanScope(raw)).toEqual(['src/a.ts']);
  });
});

describe('findOutOfScope', () => {
  it('matches exact paths', () => {
    expect(findOutOfScope(['src/a.ts'], ['src/a.ts'])).toEqual([]);
  });

  it('matches glob prefixes', () => {
    expect(
      findOutOfScope(['src/utils/units/kib.ts', 'src/utils/units/mib.ts'], ['src/utils/units/**']),
    ).toEqual([]);
  });

  it('reports files outside every scope entry', () => {
    const changed = [
      'src/components/PoolCreateModal.vue',
      'src/utils/units/kib.ts',
      'src/stores/unrelated.ts',
    ];
    const scope = [
      'src/components/PoolCreateModal.vue',
      'src/utils/units/**',
    ];
    expect(findOutOfScope(changed, scope)).toEqual(['src/stores/unrelated.ts']);
  });

  it('returns [] when scope is empty (nothing to compare against)', () => {
    expect(findOutOfScope(['any.ts'], [])).toEqual([]);
  });
});
