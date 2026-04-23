import { defineCommand } from 'citty';
import { globalArgs } from '../global-args.js';

export const whereCommand = defineCommand({
  meta: { description: 'Snapshot the current workflow state' },
  args: globalArgs,
  async run() {
    // Phase 1-4: real implementation
    console.log('conductor where: not implemented yet');
  },
});
