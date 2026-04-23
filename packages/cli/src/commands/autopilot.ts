import { defineCommand } from 'citty';
import { globalArgs } from '../global-args.js';
import { awaitAck, emitHandoff, emitSignal } from '../io.js';
import { loadConfig, work } from '@conductor-kit/core';
import { pickCommand } from './pick.js';
import { shipCommand } from './ship.js';

type ConfigLike = {
  project_key?: string;
};

type StopAt = 'pick' | 'implement' | 'ship';

const ISSUE_KEY_PATTERN = /^[A-Z][A-Z0-9]+-\d+$/;

function isIssueKey(token: string): boolean {
  return ISSUE_KEY_PATTERN.test(token);
}

function parseStopAt(raw: string | undefined): StopAt {
  if (!raw) return 'ship';
  if (raw === 'pick' || raw === 'implement' || raw === 'ship') return raw;
  throw new Error(`Invalid --stop-at "${raw}". Expected one of: pick, implement, ship.`);
}

/**
 * `conductor autopilot` — single-issue orchestrator.
 *
 * Flow: pick → (signal → adapter implements → ack) → pick --approve → ship.
 * The signal/ack protocol is the seam: the CLI cannot edit source code
 * itself, so it hands control to the agent for the implement phase.
 *
 * v1 scope: single issue only. No --parallel, no free-form prompt path.
 * `--ralph` promotes the global `--auto` flag so pick/ship take their prompt
 * defaults (plan-approval + commit-message approval skipped). Other safety
 * gates (deviation, UI verify, validation) are NOT bypassed.
 */
export const autopilotCommand = defineCommand({
  meta: {
    description:
      'Orchestrate pick → implement (agent) → ship for a single Jira issue',
  },
  args: {
    ...globalArgs,
    key: {
      type: 'positional',
      required: true,
      description: 'Jira issue key (e.g. ACME-42). Free-form prompt not yet supported.',
    },
    'stop-at': {
      type: 'string',
      description: 'Stop after phase: pick | implement | ship (default: ship)',
    },
    ralph: {
      type: 'boolean',
      default: false,
      description: 'Skip approval gates (auto-accept plan + commit message)',
    },
    'dry-run': {
      type: 'boolean',
      default: false,
      description: 'Forward to ship as --dry-run (no push / MR / Jira write)',
    },
  },
  async run({ args }) {
    const cwd = (args.cwd as string | undefined) ?? process.cwd();
    const jsonMode = Boolean(args.json);
    const ralph = Boolean(args.ralph);
    const stopAt = parseStopAt(args['stop-at'] as string | undefined);
    const dryRun = Boolean(args['dry-run']);

    // v1 guardrail: --ralph needs --json because the signal protocol only
    // works when the adapter is piping JSON on stdin.
    if (ralph && !jsonMode) {
      throw new Error('--ralph requires --json mode (signal protocol needs a JSON stdin adapter).');
    }

    const issueKey = String(args.key);
    if (!isIssueKey(issueKey)) {
      throw new Error(
        `Invalid issue key "${issueKey}". Free-form prompt is not supported in autopilot v1 — ` +
          `run \`conductor draft\` first to create the issue, then pass the returned key.`,
      );
    }

    // Surface config early so misconfigured repos fail before pick spends IO.
    await (loadConfig({ cwd }) as Promise<ConfigLike>);

    const auto = Boolean(args.auto) || ralph;

    // --- Phase A: pick (issue + branch + work-file draft) ---
    await pickCommand.run!({
      args: buildPickArgs(args, { key: issueKey, auto, json: jsonMode }),
      rawArgs: [],
      cmd: pickCommand,
      data: undefined,
      subCommand: undefined,
    } as unknown as Parameters<NonNullable<typeof pickCommand.run>>[0]);

    if (stopAt === 'pick') {
      if (jsonMode) {
        emitHandoff({
          status: 'ok',
          phase: 'autopilot/stopped-at-pick',
          data: { issue_key: issueKey },
          handoff: {
            next_cmd: `conductor autopilot ${issueKey} --stop-at implement`,
            message: 'pick complete. Work file drafted; implement phase not started.',
          },
        });
      } else {
        console.log(`autopilot ${issueKey}: stopped after pick.`);
      }
      return;
    }

    // --- Phase B: hand off to adapter for implement ---
    const workFile = work.workPath(cwd, issueKey);
    if (jsonMode) {
      emitSignal('implement', {
        issue_key: issueKey,
        work_file: workFile,
        hint: 'Read the work file, build per the plan, then reply {"id":"implement-done"} on stdin.',
      });
      await awaitAck('implement-done');
    } else {
      // TTY fallback: pause for a human to implement, then press Enter.
      process.stderr.write(
        `[autopilot] Implement per plan at ${workFile}, then press Enter to continue…\n`,
      );
      const { createInterface } = await import('node:readline');
      const rl = createInterface({ input: process.stdin, output: process.stderr });
      await new Promise<void>((resolve) => rl.question('', () => {
        rl.close();
        resolve();
      }));
    }

    // --- Phase B.5: promote plan-draft → plan-approved (ship gate) ---
    // The adapter may have edited the plan during implement; re-read and then
    // approve so the ship gate sees the latest content.
    await pickCommand.run!({
      args: buildPickArgs(args, {
        key: issueKey,
        auto,
        json: jsonMode,
        approve: true,
      }),
      rawArgs: [],
      cmd: pickCommand,
      data: undefined,
      subCommand: undefined,
    } as unknown as Parameters<NonNullable<typeof pickCommand.run>>[0]);

    if (stopAt === 'implement') {
      if (jsonMode) {
        emitHandoff({
          status: 'ok',
          phase: 'autopilot/stopped-at-implement',
          data: { issue_key: issueKey },
          handoff: {
            next_cmd: `conductor ship ${issueKey}`,
            message: 'implement + approve complete. ship not run.',
          },
        });
      } else {
        console.log(`autopilot ${issueKey}: stopped after implement. Run \`conductor ship\` next.`);
      }
      return;
    }

    // --- Phase C: ship ---
    await shipCommand.run!({
      args: buildShipArgs(args, { key: issueKey, auto, json: jsonMode, dryRun }),
      rawArgs: [],
      cmd: shipCommand,
      data: undefined,
      subCommand: undefined,
    } as unknown as Parameters<NonNullable<typeof shipCommand.run>>[0]);
    // ship emits its own handoff — autopilot does not re-emit.
  },
});

type AnyArgs = Record<string, unknown>;

interface PickArgInput {
  key: string;
  auto: boolean;
  json: boolean;
  approve?: boolean;
}

function buildPickArgs(parent: AnyArgs, inp: PickArgInput): AnyArgs {
  return {
    ...passThroughGlobals(parent),
    json: inp.json,
    auto: inp.auto,
    yes: Boolean(parent.yes) || inp.auto,
    key: inp.key,
    'no-transition': false,
    approve: Boolean(inp.approve),
  };
}

interface ShipArgInput {
  key: string;
  auto: boolean;
  json: boolean;
  dryRun: boolean;
}

function buildShipArgs(parent: AnyArgs, inp: ShipArgInput): AnyArgs {
  return {
    ...passThroughGlobals(parent),
    json: inp.json,
    auto: inp.auto,
    yes: Boolean(parent.yes),
    key: inp.key,
    'dry-run': inp.dryRun,
  };
}

function passThroughGlobals(parent: AnyArgs): AnyArgs {
  const out: AnyArgs = {};
  if (parent.agent !== undefined) out.agent = parent.agent;
  if (parent.cwd !== undefined) out.cwd = parent.cwd;
  if (parent.config !== undefined) out.config = parent.config;
  return out;
}
