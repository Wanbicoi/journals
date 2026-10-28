import { defineCommand } from "citty";
import { incrementAgentHitsApi } from "../../api/agent.js";

export const hitCommand = defineCommand({
  meta: {
    name: "hit",
    description: "Increment hit_time counter for one or more entry IDs",
  },
  args: {
    ids: {
      type: "positional",
      description: "Entry ID(s) to increment hit count",
      required: true,
    },
  },
  run: runHitCommand,
});

// @unit journals.cli.agent.hit
// @summary Reinforce entries that solved a task
// @returns Count of updated entries
async function runHitCommand({ rawArgs }: { rawArgs: string[] }) {
  // When multiple positional args are provided, gather all trailing positional arguments
  const idList = rawArgs.filter((arg) => !arg.startsWith("-"));
  if (idList.length === 0) {
    console.error("Error: At least one ID required. Usage: journals agent hit <id...>");
    process.exit(1);
  }

  // @call journals.api.agent.hit Increment the hit counters
  const data = await incrementAgentHitsApi(idList);
  console.log(`Updated hit count for ${data.updated} entry/entries.`);
}
