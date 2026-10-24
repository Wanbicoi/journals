import { RRule, rrulestr } from "rrule";
export * from "./schemas.js";
export * from "./config.js";

export interface ParsedCapture {
  content: string;
  projectName: string | null;
  tags: string[];
  breakDays: number;
}

/**
 * Parses user input into an RFC 5545 RRULE string.
 * Supports natural language (e.g. "every 3 days", "every weekday", "every monday")
 * and standard RRULE strings (e.g. "FREQ=DAILY;INTERVAL=3").
 */
export function normalizeRecurrenceRule(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Try direct RRULE parse
  try {
    const rule = rrulestr(trimmed);
    const str = rule.toString();
    return str.startsWith("RRULE:") ? str.slice(6) : str;
  } catch {
    // If not standard RRULE, try natural language
  }

  try {
    const rule = RRule.fromText(trimmed);
    if (rule) {
      const str = rule.toString();
      return str.startsWith("RRULE:") ? str.slice(6) : str;
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Returns human-readable description of an RRULE string.
 */
export function formatRecurrenceRule(rruleStr: string | null | undefined): string {
  if (!rruleStr) return "";
  try {
    const rule = rrulestr(rruleStr.startsWith("RRULE:") ? rruleStr : `RRULE:${rruleStr}`);
    return rule.toText();
  } catch {
    return rruleStr;
  }
}

export function parseCaptureLine(
  raw: string,
  defaultProject: string | null = "Inbox",
): ParsedCapture {
  const tokens = raw.trim().split(/\s+/);
  let explicitProject: string | null = null;
  let breakDays = 0;
  const tags: string[] = [];
  const textWords: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.startsWith("@") && token.length > 1) {
      explicitProject = token.slice(1);
    } else if (token.startsWith("#") && token.length > 1) {
      tags.push(token.slice(1).toLowerCase());
    } else if (token.toLowerCase().startsWith("/break")) {
      // Check syntax: "/break 3d", "/break 3", "/break:3d", "/break:3"
      let days = 1;
      if (token.includes(":")) {
        const afterColon = token.split(":")[1];
        const parsedNum = Number.parseInt(afterColon.replace(/[^0-9]/g, ""), 10);
        if (!Number.isNaN(parsedNum) && parsedNum > 0) {
          days = parsedNum;
        }
      } else if (i + 1 < tokens.length && /^\d+d?$/i.test(tokens[i + 1])) {
        const nextToken = tokens[i + 1];
        const parsedNum = Number.parseInt(nextToken.replace(/[^0-9]/g, ""), 10);
        if (!Number.isNaN(parsedNum) && parsedNum > 0) {
          days = parsedNum;
          i++; // consume next token
        }
      }
      breakDays = days;
    } else {
      textWords.push(token);
    }
  }

  // If a break is requested without an explicit @project, it's global (projectName = null)
  let resolvedProject = explicitProject;
  if (resolvedProject === null) {
    if (breakDays > 0) {
      resolvedProject = null; // Global break across all projects
    } else {
      resolvedProject = defaultProject;
    }
  }

  return {
    content: textWords.join(" "),
    projectName: resolvedProject,
    tags,
    breakDays,
  };
}
