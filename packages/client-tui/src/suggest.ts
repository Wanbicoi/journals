export interface SuggestionMatch {
  type: "project" | "tag";
  value: string;
  triggerIndex: number;
}

export function detectSuggestionQuery(
  input: string,
): { type: "project" | "tag"; query: string; triggerIndex: number } | null {
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

  return null;
}
