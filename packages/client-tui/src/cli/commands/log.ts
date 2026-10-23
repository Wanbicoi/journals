import { parseArgs } from "node:util";
import { createAgentEntryApi } from "../../api/agent.js";

export async function handleLogCommand(args: string[]): Promise<void> {
  const { values, positionals } = parseArgs({
    args,
    options: {
      project: { type: "string", short: "p" },
    },
    allowPositionals: true,
  });

  const content = positionals.join(" ").trim();
  if (!content) {
    console.error(
      "Error: Missing entry content. Usage: journals agent log [--project <name>] <content>",
    );
    process.exit(1);
  }

  const result = await createAgentEntryApi(content, values.project || "Agent");
  console.log(`Created agent entry [${result.id}] under project "${result.projectName}"`);
}
