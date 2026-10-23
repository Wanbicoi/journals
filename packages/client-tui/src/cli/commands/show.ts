import { defineCommand } from "citty";
import { getAgentEntriesBatchApi } from "../../api/agent.js";
import { formatEntryDetail } from "../formatters.js";

export const showCommand = defineCommand({
  meta: {
    name: "show",
    description: "Inspect full content and details for one or multiple entry IDs",
  },
  args: {
    id: {
      type: "positional",
      description: "Entry ID(s)",
      required: true,
    },
    json: {
      type: "boolean",
      description: "Output formatted JSON",
      default: false,
    },
  },
  async run({ args, rawArgs }) {
    const ids = rawArgs.filter((arg) => !arg.startsWith("-"));
    if (ids.length === 0) {
      console.error("Error: At least one ID required. Usage: journals agent show <id...> [--json]");
      process.exit(1);
    }

    const { entries } = await getAgentEntriesBatchApi(ids);
    if (!entries || entries.length === 0) {
      console.log("No entries found for specified ID(s).");
      return;
    }

    if (args.json) {
      console.log(JSON.stringify(entries, null, 2));
      return;
    }

    for (const entry of entries) {
      console.log(formatEntryDetail(entry));
    }
  },
});
