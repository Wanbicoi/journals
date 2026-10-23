import { defineCommand } from "citty";
import { listAgentEntriesApi } from "../../api/agent.js";

export const listCommand = defineCommand({
  meta: {
    name: "list",
    description: "List recent agent entries ordered by priority/hit_time and recency",
  },
  args: {
    project: {
      type: "string",
      alias: "p",
      description: "Filter by project ID",
    },
    limit: {
      type: "string",
      alias: "n",
      description: "Number of entries to return",
      default: "20",
    },
    json: {
      type: "boolean",
      description: "Output formatted JSON",
      default: false,
    },
  },
  async run({ args }) {
    const limit = Number(args.limit) || 20;
    const { entries } = await listAgentEntriesApi(args.project, limit);

    if (!entries || entries.length === 0) {
      console.log("No agent entries found.");
      return;
    }

    if (args.json) {
      console.log(JSON.stringify(entries, null, 2));
      return;
    }

    console.log(`Listing ${entries.length} agent entries:\n`);
    for (const entry of entries) {
      const firstLine = entry.content.split("\n")[0].slice(0, 80);
      console.log(
        `[${entry.id}] (hits: ${String(entry.hitTime).padStart(2, " ")}) [${entry.projectName}] ${firstLine}`,
      );
    }
  },
});
