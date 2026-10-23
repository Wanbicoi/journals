import { defineCommand } from "citty";
import { createAgentEntryApi } from "../../api/agent.js";

export const logCommand = defineCommand({
  meta: {
    name: "log",
    description: "Record an episodic or procedural entry into agent memory",
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
      description: "Memory note content (recommend tags like [episodic] or [procedural])",
      required: true,
    },
  },
  async run({ args, rawArgs }) {
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

    const result = await createAgentEntryApi(content, args.project);
    console.log(`Created agent entry [${result.id}] under project "${result.projectName}"`);
  },
});
