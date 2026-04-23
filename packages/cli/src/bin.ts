import { defineCommand, runMain } from 'citty';

const main = defineCommand({
  meta: {
    name: 'conductor',
    description: 'Multi-agent team workflow conductor',
  },
  subCommands: {
    where: defineCommand({
      meta: { description: 'Snapshot the current workflow state' },
      async run() {
        console.log('conductor where: not implemented yet');
      },
    }),
  },
});

runMain(main);
