import { parseArgs } from "node:util";
import { incrementAgentHitsApi } from "../../api/agent.js";

export async function handleHitCommand(args: string[]): Promise<void> {
  const { positionals } = parseArgs({
    args,
    allowPositionals: true,
  });

  const ids = positionals.filter(Boolean);
  if (ids.length === 0) {
    console.error("Error: At least one ID required. Usage: journals agent hit <id...>");
    process.exit(1);
  }

  const data = await incrementAgentHitsApi(ids);
  console.log(`Updated hit count for ${data.updated} entry/entries.`);
}
