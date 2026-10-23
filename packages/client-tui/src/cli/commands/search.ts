import { parseArgs } from "node:util";
import { searchAgentEntriesApi } from "../../api/agent.js";

export async function handleSearchCommand(args: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args,
    options: {
      limit: { type: "string", short: "n", default: "20" },
    },
    allowPositionals: true,
  });

  const query = positionals.join(" ").trim();
  if (!query) {
    console.error(
      "Error: Search query required. Usage: journals agent search <query...> [--limit <n>]",
    );
    process.exit(1);
  }

  const limit = Number(values.limit) || 20;
  const { entries } = await searchAgentEntriesApi(query, limit);

  if (!entries || entries.length === 0) {
    console.log(`No agent entries matching "${query}".`);
    return;
  }

  console.log(`Found ${entries.length} matching agent entries:\n`);
  for (const entry of entries) {
    console.log(`━━━ [ID: ${entry.id}] (hits: ${entry.hitTime}) Project: ${entry.projectName} ━━━`);
    if (entry.preview) {
      console.log(entry.preview);
    } else {
      console.log(entry.snippet || entry.content.slice(0, 140));
    }
    console.log("");
  }
}
