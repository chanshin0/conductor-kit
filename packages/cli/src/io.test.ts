import { describe, expect, it } from 'vitest';
import { emitJson } from './io.js';

describe('emitJson', () => {
  it('writes a single JSON line to stdout', () => {
    let captured = '';
    const orig = process.stdout.write.bind(process.stdout);
    process.stdout.write = ((chunk: string) => {
      captured += chunk;
      return true;
    }) as typeof process.stdout.write;
    try {
      emitJson({ hello: 'world' });
    } finally {
      process.stdout.write = orig;
    }
    expect(captured).toBe('{"hello":"world"}\n');
  });
});
