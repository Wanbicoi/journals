import { parseArgs } from "node:util";
import { getAgentEntriesBatchApi } from "../../api/agent.js";
import { formatEntryDetail } from "../formatters.js";

export async function handleShowCommand(args: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args,
    options: {
      json: { type: "boolean", default: false },
    },
    allowPositionals: true,
  });

  const ids = positionals.filter(Boolean);
  if (ids.length === 0) {
    console.error("Error: At least one ID required. Usage: journals agent show <id...> [--json]");
    process.exit(1);
  }

  const { entries } = await getAgentEntriesBatchApi(ids);
  if (!entries || entries.length === 0) {
    console.log("No entries found for specified ID(s).");
    return;
  }

  if (values.json) {
    console.log(JSON.stringify(entries, null, 2));
    return;
  }

  for (const entry of entries) {
    console.log(formatEntryDetail(entry));
  }
}
