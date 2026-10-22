export * from "./schemas.js";
export * from "./config.js";

export interface ParsedCapture {
  content: string;
  projectName: string;
  tags: string[];
}

export function parseCaptureLine(
  raw: string,
  defaultProject = "Inbox",
  defaultTags: string[] = ["quick"],
): ParsedCapture {
  const tokens = raw.trim().split(/\s+/);
  let projectName = defaultProject;
  const tags: string[] = [];
  const textWords: string[] = [];

  for (const token of tokens) {
    if (token.startsWith("@") && token.length > 1) {
      projectName = token.slice(1);
    } else if (token.startsWith("#") && token.length > 1) {
      tags.push(token.slice(1).toLowerCase());
    } else {
      textWords.push(token);
    }
  }

  return {
    content: textWords.join(" "),
    projectName,
    tags: tags.length > 0 ? tags : defaultTags,
  };
}
