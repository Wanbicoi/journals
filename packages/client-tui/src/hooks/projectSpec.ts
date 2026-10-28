import { type ProjectMissedPolicy, normalizeRecurrenceRule } from "@journals/core";

export interface ProjectSpec {
  name: string;
  /** `undefined` when the input said nothing, `null` when it asked to clear the routine. */
  recurrence: string | null | undefined;
  missedPolicy: ProjectMissedPolicy | undefined;
}

type ProjectCommandType = "recur" | "policy";

interface ProjectCommand {
  type: ProjectCommandType;
  index: number;
  valueStart: number;
}

const PROJECT_COMMAND_RE = /(^|\s)\/(recur|policy):/gi;
const POLICY_VALUES: ProjectMissedPolicy[] = ["accumulate", "spike", "mark_done"];

function findProjectCommand(raw: string, from: number): ProjectCommand | null {
  const re = new RegExp(PROJECT_COMMAND_RE.source, "gi");
  re.lastIndex = from;
  const match = re.exec(raw);
  if (!match) return null;

  const index = match.index + match[1].length;
  return {
    type: match[2].toLowerCase() as ProjectCommandType,
    index,
    valueStart: index + match[2].length + 2,
  };
}

function collectProjectCommands(raw: string): ProjectCommand[] {
  const commands: ProjectCommand[] = [];
  let cursor = 0;

  while (true) {
    const command = findProjectCommand(raw, cursor);
    if (!command) break;
    commands.push(command);
    cursor = command.valueStart;
  }

  return commands;
}

export interface ParseProjectSpecOptions {
  /** Throw instead of silently dropping invalid values; used when the modal submits. */
  strict?: boolean;
}

/**
 * The slash syntax a project row accepts: `Reading /recur:every weekday /policy:accumulate`.
 * Pure, so both the create and the settings modal share one parser and the preview cannot drift
 * from the value that gets saved.
 */

// @unit journals.hooks.project-spec
// @summary Parse a project name, recurrence, and missed policy
export function parseProjectSpec(
  raw: string,
  { strict = false }: ParseProjectSpecOptions = {},
): ProjectSpec {
  const commands = collectProjectCommands(raw);
  const name = (commands[0] ? raw.slice(0, commands[0].index) : raw).trim();

  let recurrence: string | null | undefined;
  let missedPolicy: ProjectMissedPolicy | undefined;

  for (let i = 0; i < commands.length; i++) {
    const command = commands[i];
    const valueEnd = commands[i + 1]?.index ?? raw.length;
    const value = raw.slice(command.valueStart, valueEnd).trim();

    if (command.type === "recur") {
      if (!value) {
        if (strict) throw new Error("Missing /recur value");
        continue;
      }

      const normalizedValue = value.toLowerCase();
      if (normalizedValue === "none" || normalizedValue === "clear") {
        recurrence = null;
        continue;
      }

      const normalized = normalizeRecurrenceRule(value);
      if (!normalized) {
        if (strict) {
          throw new Error(
            `Invalid /recur value "${value}" (use a natural-language cadence or an RRULE)`,
          );
        }
        continue;
      }
      recurrence = normalized;
      continue;
    }

    const policy = value.toLowerCase() as ProjectMissedPolicy;
    if (!POLICY_VALUES.includes(policy)) {
      if (strict) {
        throw new Error(`Invalid /policy value "${value}" (use accumulate, spike, or mark_done)`);
      }
      continue;
    }
    missedPolicy = policy;
  }

  return { name, recurrence, missedPolicy };
}
