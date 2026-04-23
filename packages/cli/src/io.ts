import { createInterface } from 'node:readline';

export interface QuestionRequest {
  type: 'question';
  id: string;
  prompt: string;
  choices?: string[];
  default?: string;
}

export interface QuestionAnswer {
  id: string;
  answer: string;
}

export type HandoffStatus = 'ok' | 'blocked' | 'deferred-to-agent';

export interface HandoffPayload {
  status: HandoffStatus;
  phase: string;
  data?: Record<string, unknown>;
  handoff?: { next_cmd?: string; message?: string };
}

/** Print one JSON line to stdout. Used by --json mode. */
export function emitJson(obj: unknown): void {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

/** Print a final handoff payload on the way out. */
export function emitHandoff(payload: HandoffPayload): void {
  emitJson(payload);
}

/** Read a single JSON line from stdin and parse it. Returns null on EOF. */
export function readJsonLine<T = unknown>(): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const rl = createInterface({ input: process.stdin });
    rl.once('line', (line) => {
      rl.close();
      try {
        resolve(JSON.parse(line) as T);
      } catch (err) {
        reject(err);
      }
    });
    rl.once('close', () => resolve(null));
  });
}

export interface PromptOptions {
  id: string;
  prompt: string;
  choices?: string[];
  /** Default answer used in --auto mode or when non-interactive with no JSON bridge. */
  default?: string;
}

export interface PromptContext {
  json: boolean;
  auto: boolean;
}

/**
 * Ask one question. In `--json` mode, emit a QuestionRequest and read a QuestionAnswer back
 * over stdin. In `--auto` mode, return the declared default (or empty string). Otherwise,
 * fall back to a TTY prompt via readline.
 */
export async function promptOne(opts: PromptOptions, ctx: PromptContext): Promise<string> {
  if (ctx.auto) {
    return opts.default ?? opts.choices?.[0] ?? '';
  }

  if (ctx.json) {
    emitJson({
      type: 'question',
      id: opts.id,
      prompt: opts.prompt,
      ...(opts.choices ? { choices: opts.choices } : {}),
      ...(opts.default !== undefined ? { default: opts.default } : {}),
    } satisfies QuestionRequest);
    const ans = await readJsonLine<QuestionAnswer>();
    if (!ans) throw new Error(`No answer received on stdin for question "${opts.id}"`);
    if (ans.id !== opts.id) {
      throw new Error(`Mismatched answer id: expected "${opts.id}", got "${ans.id}"`);
    }
    return ans.answer;
  }

  // Plain TTY fallback
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  const suffix = opts.choices ? ` [${opts.choices.join('/')}]` : '';
  const defaultHint = opts.default !== undefined ? ` (default: ${opts.default})` : '';
  return await new Promise<string>((resolve) => {
    rl.question(`${opts.prompt}${suffix}${defaultHint}: `, (line) => {
      rl.close();
      const trimmed = line.trim();
      resolve(trimmed || opts.default || '');
    });
  });
}
