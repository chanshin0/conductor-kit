#!/usr/bin/env node
import { defineCommand, runMain } from 'citty';

const main = defineCommand({
  meta: {
    name: 'conductor-install',
    description: 'Install conductor-kit agent adapters into the current repository',
  },
  args: {
    agent: {
      type: 'string',
      description: 'claude | codex | cursor | all',
      required: true,
    },
    'dry-run': {
      type: 'boolean',
      description: 'Show what would be written without touching the filesystem',
    },
  },
  async run({ args }) {
    console.log(`conductor-install --agent ${args.agent}: not implemented yet`);
  },
});

runMain(main);
