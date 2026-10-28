import { defineCommand } from "citty";
import { searchAgentEntriesApi } from "../../api/agent.js";

export const searchCommand = defineCommand({
  meta: {
    name: "search",
    description: "Full-text search (FTS5) across agent memory entries",
  },
  args: {
    limit: {
      type: "string",
      alias: "n",
      description: "Max number of results to return",
      default: "20",
    },
    "include-superseded": {
      type: "boolean",
      description: "Include entries that have been superseded",
      default: false,
    },
    query: {
      type: "positional",
      description: "Search keywords or pattern",
      required: true,
    },
  },
  run: runSearchCommand,
});

// @unit journals.cli.agent.search
// @summary Search agent memory
// @returns Matching entries with ids, hit counts, and previews
// @details Prints the contextual preview when the server produced one,
// | otherwise the FTS snippet or the first 140 characters of the note.
async function runSearchCommand({
  args,
  rawArgs,
}: {
  args: { limit: string; "include-superseded": boolean; query: string };
  rawArgs: string[];
}) {
  const positionalTokens = rawArgs.filter((arg, idx) => {
    if (arg.startsWith("-")) return false;
    const prev = rawArgs[idx - 1];
    if (prev === "-n" || prev === "--limit") return false;
    return true;
  });

  const query = positionalTokens.join(" ").trim() || args.query;
  if (!query) {
    console.error(
      "Error: Search query required. Usage: journals agent search <query...> [--limit <n>]",
    );
    process.exit(1);
  }

  const limit = Number(args.limit) || 20;
  // @call journals.api.agent.search Search agent entries
  const { entries } = await searchAgentEntriesApi(query, limit, args["include-superseded"]);

  if (!entries || entries.length === 0) {
    console.log(`No agent entries matching "${query}".`);
    return;
  }

  console.log(`Found ${entries.length} matching agent entries:\n`);
  for (const entry of entries) {
    console.log(
      `━━━ [ID: ${entry.id}] (hits: ${entry.hitCount}) Project: ${entry.projectName} ━━━`,
    );
    if (entry.preview) {
      console.log(entry.preview);
    } else {
      console.log(entry.snippet || entry.content.slice(0, 140));
    }
    console.log("");
  }
}
