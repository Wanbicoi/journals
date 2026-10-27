import { RRule, rrulestr } from "rrule";
export * from "./schemas.js";
export * from "./config.js";

export interface ParsedCapture {
  content: string;
  projectName: string | null;
  tags: string[];
  breakDays: number;
  date?: number | null;
}

/**
 * Returns effective YYYY-MM-DD string considering a day rollover hour cutoff.
 * If hour < dayStartHour, the date is considered part of the previous calendar day.
 */
export function getEffectiveDateStr(dateInput: number | string | Date, dayStartHour = 0): string {
  const d = new Date(dateInput);
  const shifted = new Date(d.getTime() - dayStartHour * 3600 * 1000);
  return shifted.toISOString().slice(0, 10);
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

// @unit journals.core.capture-parse
// @summary Parse @project, #tags, /date, and /break from a capture line
export function parseCaptureLine(
  raw: string,
  defaultProject: string | null = "Inbox",
): ParsedCapture {
  const tokens = raw.trim().split(/\s+/);
  let explicitProject: string | null = null;
  let breakDays = 0;
  let explicitDate: number | null = null;
  const tags: string[] = [];
  const textWords: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.startsWith("@") && token.length > 1) {
      explicitProject = token.slice(1);
    } else if (token.startsWith("#") && token.length > 1) {
      tags.push(token.slice(1).toLowerCase());
    } else if (token.toLowerCase() === "/yesterday") {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      explicitDate = yesterday.getTime();
    } else if (token.toLowerCase().startsWith("/date")) {
      let dateString: string | null = null;
      if (token.includes(":")) {
        dateString = token.split(":")[1];
      } else if (i + 1 < tokens.length && /^\d{4}-\d{2}-\d{2}$/.test(tokens[i + 1])) {
        dateString = tokens[i + 1];
        i++; // consume date token
      }
      if (dateString && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [y, m, d] = dateString.split("-").map(Number);
        const parsed = new Date();
        parsed.setFullYear(y, m - 1, d);
        explicitDate = parsed.getTime();
      }
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
    date: explicitDate,
  };
}
