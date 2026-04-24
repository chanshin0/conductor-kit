import { describe, expect, it } from 'vitest';
import { autopilotCommand } from './autopilot.js';

// The orchestrator itself is integration-heavy (pick + ship under the hood),
// so unit coverage here is limited to argument validation + guardrails. The
// signal/ack protocol is covered by io.test.ts. Real end-to-end behavior
// lands in the 3-agent E2E suite once Phase 2 Done is wired up.

function run(args: Record<string, unknown>): Promise<unknown> {
  return autopilotCommand.run!({
    args,
    rawArgs: [],
    cmd: autopilotCommand,
    // Citty injects more — we pass the minimal slice the handler reads.
  } as unknown as Parameters<NonNullable<typeof autopilotCommand.run>>[0]);
}

describe('autopilot arg validation', () => {
  it('rejects free-form prompt without --json (signal protocol requires JSON adapter)', async () => {
    await expect(
      run({ key: 'fix the thing', json: false }),
    ).rejects.toThrow(/Free-form autopilot requires --json/);
  });

  it('rejects --ralph without --json (signal protocol needs JSON stdin)', async () => {
    await expect(
      run({ key: 'ACME-42', ralph: true, json: false }),
    ).rejects.toThrow(/--ralph requires --json/);
  });

  it('rejects an unknown --stop-at value', async () => {
    await expect(
      run({ key: 'ACME-42', json: true, 'stop-at': 'mr' }),
    ).rejects.toThrow(/Invalid --stop-at/);
  });

  it('accepts an issue key with numeric project prefix (e.g. A1-5)', async () => {
    // Downstream errors (missing config/jira) are expected in this env, but
    // the pattern guard must not fire.
    await expect(
      run({ key: 'A1-5', json: true, 'stop-at': 'pick' }),
    ).rejects.not.toThrow(/Free-form autopilot requires --json/);
  });
});
