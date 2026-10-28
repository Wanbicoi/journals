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
      description: "Project name or ID (defaults to 'Agent')",
      default: "Agent",
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
// | defaults the project to `Agent`, so an agent can always log in one call.
async function runLogCommand({
  args,
  rawArgs,
}: {
  args: { project: string; content: string };
  rawArgs: string[];
}) {
  // Collect any multiple trailing tokens into a single text if unquoted
  const positionalTokens = rawArgs.filter((arg, idx) => {
    if (arg.startsWith("-")) return false;
    const prev = rawArgs[idx - 1];
    if (prev === "-p" || prev === "--project") return false;
    return true;
  });

  const content = positionalTokens.join(" ").trim() || args.content;
  if (!content) {
    console.error(
      "Error: Missing entry content. Usage: journals agent log [--project <name>] <content>",
    );
    process.exit(1);
  }

  // @call journals.api.agent.create Create an agent entry
  const result = await createAgentEntryApi(content, args.project);
  console.log(`Created agent entry [${result.id}] under project "${result.projectName}"`);
}
