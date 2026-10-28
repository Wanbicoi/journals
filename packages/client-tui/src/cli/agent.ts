import { defineCommand, runMain } from "citty";
import { hitCommand } from "./commands/hit.js";
import { listCommand } from "./commands/list.js";
import { logCommand } from "./commands/log.js";
import { searchCommand } from "./commands/search.js";
import { showCommand } from "./commands/show.js";

export const agentMainCommand = defineCommand({
  meta: {
    name: "journals agent",
    description: "Memory & task entry tool for AI agents",
  },
  subCommands: {
    log: logCommand,
    search: searchCommand,
    show: showCommand,
    hit: hitCommand,
    list: listCommand,
  },
});

// @unit journals.cli.agent
// @summary Run the headless agent command line
// @details citty dispatches to the `log`, `search`, `show`, `hit`, and `list`
// | subcommands, which talk to the server over the same HTTP API as the TUI.
export async function runAgentCli(args: string[]): Promise<void> {
  try {
    await dispatchAgentCommand(args);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}

// @unit journals.cli.agent.dispatch
// @summary Dispatch an agent memory subcommand
// @details citty resolves the first positional token to exactly one of the
// | five subcommands, so the tree lists every branch the dispatcher can take.
async function dispatchAgentCommand(args: string[]): Promise<void> {
  await runMain(
    /* @call journals.cli.agent.log Record a fix or runbook entry */
    /* @call journals.cli.agent.search Search agent memory */
    /* @call journals.cli.agent.show Inspect entries by id */
    /* @call journals.cli.agent.hit Reinforce entries that solved a task */
    /* @call journals.cli.agent.list List recent entries */
    agentMainCommand,
    { rawArgs: args },
  );
}
