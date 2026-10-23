import { handleHitCommand } from "./commands/hit.js";
import { handleListCommand } from "./commands/list.js";
import { handleLogCommand } from "./commands/log.js";
import { handleSearchCommand } from "./commands/search.js";
import { handleShowCommand } from "./commands/show.js";

function printHelp() {
  console.log(`journals agent - Memory & task entry tool for AI agents

Usage:
  journals agent <command> [options] [arguments...]

Commands:
  log [--project <name|id>] <content>
      Record an episodic or procedural entry into agent memory.
      * Note: Recommended to label your entry content with tags such as
        [episodic] for context, execution traces, runtime observations
        [procedural] for reusable steps, commands, and recipes.

  search <query...> [--limit <n>]
      Full-text search (FTS5) across agent memory entries.
      Boosts ranking by hit_time (frequently matched solutions rank higher).
      Displays matching context window with surrounding lines.

  show <id...> [--json]
      Inspect full content and details for one or multiple entry IDs.

  hit <id...>
      Increment hit_time counter for one or more entry IDs.
      Call this when a memory note or procedure successfully solved/matched a task.

  list [--project <id>] [--limit <n>] [--json]
      List recent agent entries ordered by priority/hit_time and recency.

Options:
  --help, -h    Show this help message
`);
}

export async function runAgentCli(args: string[]): Promise<void> {
  const [subcommand, ...rest] = args;

  if (!subcommand || subcommand === "--help" || subcommand === "-h" || subcommand === "help") {
    printHelp();
    return;
  }

  try {
    switch (subcommand) {
      case "log":
        await handleLogCommand(rest);
        break;
      case "search":
        await handleSearchCommand(rest);
        break;
      case "show":
        await handleShowCommand(rest);
        break;
      case "hit":
        await handleHitCommand(rest);
        break;
      case "list":
        await handleListCommand(rest);
        break;
      default:
        console.error(
          `Unknown subcommand: "${subcommand}". Use "journals agent --help" for usage.`,
        );
        process.exit(1);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${message}`);
    process.exit(1);
  }
}
