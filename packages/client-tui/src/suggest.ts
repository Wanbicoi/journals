export type SuggestionType = "project" | "tag" | "break";

export function detectSuggestionQuery(
  input: string,
): { type: SuggestionType; query: string; triggerIndex: number } | null {
  // Look at word preceding cursor
  const tagMatch = /(?:^|\s)#([a-zA-Z0-9-_]*)$/.exec(input);
  if (tagMatch) {
    const triggerIndex = input.lastIndexOf("#");
    return { type: "tag", query: tagMatch[1], triggerIndex };
  }

  const projMatch = /(?:^|\s)@([a-zA-Z0-9-_]*)$/.exec(input);
  if (projMatch) {
    const triggerIndex = input.lastIndexOf("@");
    return { type: "project", query: projMatch[1], triggerIndex };
  }

  const breakMatch = /(?:^|\s)(\/(?:break(?::?\s*\d*d?)?|[a-zA-Z0-9-_]*))$/i.exec(input);
  if (breakMatch) {
    const triggerIndex = input.lastIndexOf(breakMatch[1]);
    return { type: "break", query: breakMatch[1], triggerIndex };
  }

  return null;
}
