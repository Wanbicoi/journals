import { defineCommand } from "citty";
import { createAgentEntryApi } from "../../api/agent.js";

export const logCommand = defineCommand({
  meta: {
    name: "log",
    description: "Record a fix or runbook entry into agent memory",
  },
  args: {
    project: {
      type: "string",
      alias: "p",
      description: "Project name or ID (defaults to the superseded entry's project, else 'Agent')",
    },
    supersedes: {
      type: "string",
      alias: "s",
      description: "Comma-separated entry ids this note replaces",
    },
    content: {
      type: "positional",
      description: "Memory note content (title, then Cause and Resolution)",
      required: true,
    },
  },
  run: runLogCommand,
});

// @unit journals.cli.agent.log
// @summary Record a fix or runbook entry
// @returns Confirmation with the new entry id
// @details Rejoins any unquoted trailing tokens into one content string and
// | retires the entries named by --supersedes in the same call.
async function runLogCommand({
  args,
  rawArgs,
}: {
  args: { project?: string; supersedes?: string; content: string };
  rawArgs: string[];
}) {
  const supersedes = (args.supersedes ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  // Collect any multiple trailing tokens into a single text if unquoted
  const positionalTokens = rawArgs.filter((arg, idx) => {
    if (arg.startsWith("-")) return false;
    const prev = rawArgs[idx - 1];
    if (prev === "-p" || prev === "--project") return false;
    if (prev === "-s" || prev === "--supersedes") return false;
    return true;
  });

  const content = positionalTokens.join(" ").trim() || args.content;
  if (!content) {
    console.error(
      "Error: Missing entry content. Usage: journals agent log [--project <name>] [--supersedes <ids>] <content>",
    );
    process.exit(1);
  }

  // @call journals.api.agent.create Create an agent entry
  const result = await createAgentEntryApi(content, args.project, undefined, supersedes);
  const retired =
    result.supersedes.length > 0 ? `, retired ${result.supersedes.length} entry/entries` : "";
  console.log(`Created agent entry [${result.id}] under project "${result.projectName}"${retired}`);
}
