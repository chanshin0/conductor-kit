import { describe, it, expect } from 'vitest';
import { runValidation } from './validation.js';

describe('runValidation', () => {
  it('reports all commands as ok when every command exits 0', async () => {
    const r = await runValidation(['true', 'echo hi'], { cwd: process.cwd() });
    expect(r.ok).toBe(true);
    expect(r.checks).toHaveLength(2);
    expect(r.checks.every((c) => c.ok)).toBe(true);
    expect(r.checks[1]!.tail).toContain('hi');
  });

  it('reports failures without throwing; ok:false, other results still collected', async () => {
    const r = await runValidation(
      ['echo ok-cmd', 'false', "sh -c 'exit 3'"],
      { cwd: process.cwd() },
    );
    expect(r.ok).toBe(false);
    expect(r.checks[0]!.ok).toBe(true);
    expect(r.checks[1]!.ok).toBe(false);
    expect(r.checks[1]!.exitCode).toBe(1);
    expect(r.checks[2]!.ok).toBe(false);
    expect(r.checks[2]!.exitCode).toBe(3);
  });

  it('supports shell features (pipes, $()) through sh -c', async () => {
    const r = await runValidation([`echo abc | tr a-z A-Z`], { cwd: process.cwd() });
    expect(r.ok).toBe(true);
    expect(r.checks[0]!.tail).toContain('ABC');
  });

  it('runs commands in parallel (total < sum of sleeps)', async () => {
    const r = await runValidation(['sleep 0.3', 'sleep 0.3'], { cwd: process.cwd() });
    expect(r.ok).toBe(true);
    expect(r.totalMs).toBeLessThan(550); // well under 600ms sum
  });
});
