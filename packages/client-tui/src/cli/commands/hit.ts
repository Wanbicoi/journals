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
  async run({ rawArgs }) {
    // When multiple positional args are provided, gather all trailing positional arguments
    const idList = rawArgs.filter((arg) => !arg.startsWith("-"));
    if (idList.length === 0) {
      console.error("Error: At least one ID required. Usage: journals agent hit <id...>");
      process.exit(1);
    }

    const data = await incrementAgentHitsApi(idList);
    console.log(`Updated hit count for ${data.updated} entry/entries.`);
  },
});
