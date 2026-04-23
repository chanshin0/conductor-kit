import { execa } from 'execa';

export interface ValidationCheck {
  /** The literal command string from `workflow.yml > validation.static`. */
  command: string;
  exitCode: number;
  durationMs: number;
  /** Truncated stdout + stderr (last ~2KB) — full output lives only in the caller's log. */
  tail: string;
  ok: boolean;
}

export interface ValidationReport {
  ok: boolean;
  checks: ValidationCheck[];
  /** Wall-clock total, useful for progress UX. */
  totalMs: number;
}

/**
 * Run every command in `commands` **in parallel** and collect the results.
 *
 * Shell features (pipes, `$(...)`) are supported because each command is
 * spawned through `sh -c`. This mirrors the legacy plugin's expectation that
 * `workflow.yml > validation.static` can contain arbitrary user commands
 * like `pnpm exec vitest related --run $(git diff --name-only main...HEAD)`.
 *
 * Failures are *not* thrown — callers inspect `report.ok` and per-check
 * `ok`. This is because `conductor ship` wants to gather *all* failures in
 * one report instead of short-circuiting.
 */
export async function runValidation(
  commands: string[],
  opts: { cwd: string },
): Promise<ValidationReport> {
  const t0 = Date.now();
  const checks = await Promise.all(
    commands.map((command) => runOne(command, opts.cwd)),
  );
  return {
    ok: checks.every((c) => c.ok),
    checks,
    totalMs: Date.now() - t0,
  };
}

async function runOne(command: string, cwd: string): Promise<ValidationCheck> {
  const started = Date.now();
  try {
    const { stdout, stderr } = await execa('sh', ['-c', command], { cwd, reject: true });
    return {
      command,
      exitCode: 0,
      durationMs: Date.now() - started,
      tail: tailFor(stdout, stderr),
      ok: true,
    };
  } catch (err) {
    const e = err as {
      exitCode?: number;
      stdout?: string;
      stderr?: string;
      shortMessage?: string;
    };
    return {
      command,
      exitCode: e.exitCode ?? 1,
      durationMs: Date.now() - started,
      tail: tailFor(e.stdout ?? '', e.stderr ?? e.shortMessage ?? ''),
      ok: false,
    };
  }
}

function tailFor(stdout: string, stderr: string): string {
  const combined = [stdout, stderr].filter(Boolean).join('\n');
  const limit = 2048;
  return combined.length <= limit
    ? combined
    : '...\n' + combined.slice(combined.length - limit);
}
