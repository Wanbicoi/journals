import { defineCommand } from "citty";
import { deleteAgentEntryApi } from "../../api/agent.js";

export const rmCommand = defineCommand({
  meta: {
    name: "rm",
    description: "Soft-delete one or more entries (hidden from list and search, restorable by id)",
    alias: ["delete", "remove"],
  },
  args: {
    id: {
      type: "positional",
      description: "Entry ID(s)",
      required: true,
    },
  },
  run: runRmCommand,
});

// @unit journals.cli.agent.rm
// @summary Remove agent entries
// @returns Confirmation naming every deleted id
async function runRmCommand({ rawArgs }: { rawArgs: string[] }) {
  const ids = rawArgs.filter((arg) => !arg.startsWith("-"));
  if (ids.length === 0) {
    console.error("Error: At least one ID required. Usage: journals agent rm <id...>");
    process.exit(1);
  }

  for (const id of ids) {
    // @call journals.api.agent.delete Soft-delete each entry
    await deleteAgentEntryApi(id);
  }
  console.log(`Deleted ${ids.length} agent entry/entries: ${ids.join(", ")}`);
}
