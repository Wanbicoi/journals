import { defineCommand } from "citty";
import { incrementAgentHitsApi } from "../../api/agent.js";

export const hitCommand = defineCommand({
  meta: {
    name: "hit",
    description: "Log that an entry helped, with a note explaining why",
  },
  args: {
    note: {
      type: "string",
      alias: "n",
      description: "Why the entry helped (required)",
      required: true,
    },
    ids: {
      type: "positional",
      description: "Entry ID(s) that helped",
      required: true,
    },
  },
  run: runHitCommand,
});

// @unit journals.cli.agent.hit
// @summary Log a hit with a note
// @returns Count of entries that received a hit log row
async function runHitCommand({
  args,
  rawArgs,
}: {
  args: { note: string; ids: string };
  rawArgs: string[];
}) {
  const note = (args.note ?? "").trim();
  if (!note) {
    console.error(
      'Error: A note is required. Usage: journals agent hit <id...> --note "<why it helped>"',
    );
    process.exit(1);
  }

  // Gather every positional token except the note's value.
  const idList = rawArgs.filter((arg, idx) => {
    if (arg.startsWith("-")) return false;
    const prev = rawArgs[idx - 1];
    if (prev === "-n" || prev === "--note") return false;
    return true;
  });

  if (idList.length === 0) {
    console.error(
      'Error: At least one ID required. Usage: journals agent hit <id...> --note "<why it helped>"',
    );
    process.exit(1);
  }

  // @call journals.api.agent.hit Log the hit
  const data = await incrementAgentHitsApi(idList, note);
  console.log(`Logged a hit for ${data.updated} entry/entries.`);
}
