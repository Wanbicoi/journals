import { parseArgs } from "node:util";
import { listAgentEntriesApi } from "../../api/agent.js";

export async function handleListCommand(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      project: { type: "string", short: "p" },
      limit: { type: "string", short: "n", default: "20" },
      json: { type: "boolean", default: false },
    },
    allowPositionals: false,
  });

  const limit = Number(values.limit) || 20;
  const { entries } = await listAgentEntriesApi(values.project, limit);

  if (!entries || entries.length === 0) {
    console.log("No agent entries found.");
    return;
  }

  if (values.json) {
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
}
