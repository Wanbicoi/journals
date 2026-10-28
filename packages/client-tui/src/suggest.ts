export type SuggestionType =
  | "command"
  | "project"
  | "tag"
  | "break"
  | "date"
  | "recurrence"
  | "policy";

export type SuggestionMode = "commands" | "plain";

/** Values inserted after `/recur:`; natural language stays readable in the settings input. */
export const RECURRENCE_SUGGESTIONS = [
  "every day",
  "every weekday",
  "every week",
  "every month",
  "every year",
  "none",
];

export const POLICY_SUGGESTIONS = ["spike", "accumulate", "mark_done"];

export const DATE_SUGGESTIONS = ["today", "yesterday"];

export const BREAK_SUGGESTIONS = ["1d", "2d", "3d", "5d", "7d", "14d"];

export const COMMAND_TYPES: Record<string, SuggestionType> = {
  project: "project",
  tag: "tag",
  break: "break",
  date: "date",
  recur: "recurrence",
  policy: "policy",
};

export interface SuggestionQuery {
  type: SuggestionType;
  query: string;
  triggerIndex: number;
}

function stripValueQuote(value: string): string {
  let stripped = value;
  if (stripped.startsWith('"')) stripped = stripped.slice(1);
  if (stripped.endsWith('"')) stripped = stripped.slice(0, -1);
  return stripped;
}

/**
 * Find the last `/<type>:` command in the input, then treat everything after it as the value.
 * Scanning for the last command (rather than matching the first) keeps `/project:A /tag:w`
 * pointing at the tag that is actually being edited.
 */
export function detectSuggestionQuery(input: string): SuggestionQuery | null {
  const commandRe = /(?:^|\s)\/([a-zA-Z]+):/g;
  let commandMatch: RegExpExecArray | null = null;
  while (true) {
    const match = commandRe.exec(input);
    if (!match) break;
    commandMatch = match;
  }

  if (commandMatch) {
    const type = COMMAND_TYPES[commandMatch[1].toLowerCase()];
    if (!type) return null;
    const triggerIndex = commandMatch.index + commandMatch[0].lastIndexOf("/");
    const valueStart = commandMatch.index + commandMatch[0].length;
    return {
      type,
      query: stripValueQuote(input.slice(valueStart).trim()),
      triggerIndex,
    };
  }

  const bareCommand = /(?:^|\s)\/([a-zA-Z]*)$/.exec(input);
  if (bareCommand) {
    return {
      type: "command",
      query: bareCommand[1].toLowerCase(),
      triggerIndex: input.lastIndexOf("/"),
    };
  }

  return null;
}

/** Entry-edit fields are already scoped, so they suggest from plain text without a trigger. */
export function detectPlainSuggestionQuery(
  input: string,
  type: "project" | "tag",
): SuggestionQuery {
  if (type === "project") {
    return { type, query: input.trim(), triggerIndex: 0 };
  }

  const comma = input.lastIndexOf(",");
  const start = comma + 1;
  const rawToken = input.slice(start);
  const leading = rawToken.length - rawToken.trimStart().length;
  return {
    type,
    query: rawToken.trim(),
    triggerIndex: start + leading,
  };
}
