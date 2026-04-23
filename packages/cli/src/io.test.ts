import { describe, expect, it } from 'vitest';
import { emitJson, emitSignal } from './io.js';

function captureStdout(fn: () => void): string {
  let captured = '';
  const orig = process.stdout.write.bind(process.stdout);
  process.stdout.write = ((chunk: string) => {
    captured += chunk;
    return true;
  }) as typeof process.stdout.write;
  try {
    fn();
  } finally {
    process.stdout.write = orig;
  }
  return captured;
}

describe('emitJson', () => {
  it('writes a single JSON line to stdout', () => {
    const out = captureStdout(() => emitJson({ hello: 'world' }));
    expect(out).toBe('{"hello":"world"}\n');
  });
});

describe('emitSignal', () => {
  it('emits a type=signal envelope with the given step and extra data', () => {
    const out = captureStdout(() =>
      emitSignal('implement', { issue_key: 'ACME-42', work_file: '.work/ACME-42.md' }),
    );
    const parsed = JSON.parse(out.trim());
    expect(parsed).toEqual({
      type: 'signal',
      step: 'implement',
      issue_key: 'ACME-42',
      work_file: '.work/ACME-42.md',
    });
  });

  it('works with no extra data', () => {
    const out = captureStdout(() => emitSignal('noop'));
    expect(JSON.parse(out.trim())).toEqual({ type: 'signal', step: 'noop' });
  });
});
