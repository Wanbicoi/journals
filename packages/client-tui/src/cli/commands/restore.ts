import { defineCommand } from "citty";
import { restoreAgentEntryApi } from "../../api/agent.js";

export const restoreCommand = defineCommand({
  meta: {
    name: "restore",
    description: "Restore soft-deleted entries by id",
  },
  args: {
    id: {
      type: "positional",
      description: "Entry ID(s)",
      required: true,
    },
  },
  run: runRestoreCommand,
});

// @unit journals.cli.agent.restore
// @summary Restore agent entries
// @returns Confirmation naming every restored id
async function runRestoreCommand({ rawArgs }: { rawArgs: string[] }) {
  const ids = rawArgs.filter((arg) => !arg.startsWith("-"));
  if (ids.length === 0) {
    console.error("Error: At least one ID required. Usage: journals agent restore <id...>");
    process.exit(1);
  }

  for (const id of ids) {
    // @call journals.api.agent.restore Restore each entry
    await restoreAgentEntryApi(id);
  }
  console.log(`Restored ${ids.length} agent entry/entries: ${ids.join(", ")}`);
}
