import { defineCommand, runMain } from 'citty';
import { globalArgs } from './global-args.js';
import { whereCommand } from './commands/where.js';
import { initCommand } from './commands/init.js';
import { pickCommand } from './commands/pick.js';
import { landCommand } from './commands/land.js';

const main = defineCommand({
  meta: {
    name: 'conductor',
    description: 'Multi-agent team workflow conductor — one CLI for Claude / Codex / Cursor.',
  },
  args: globalArgs,
  subCommands: {
    init: initCommand,
    where: whereCommand,
    pick: pickCommand,
    land: landCommand,
  },
});

runMain(main);
