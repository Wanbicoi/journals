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

/**
 * Raised when a recognized capture command has a missing or invalid value.
 * The server maps it to a 400 so the modal can stay open and show the message.
 */
export class CaptureParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CaptureParseError";
  }
}

/** Quote a project name only when it needs spaces to survive capture tokenization. */
export function quoteProjectNameForCapture(name: string): string {
  return /\s/.test(name) ? `"${name}"` : name;
}

export interface CaptureToken {
  /** Original token, including quotes, used when the token is ordinary note text. */
  raw: string;
  /** Unquoted token, used for command parsing and values. */
  value: string;
  /** False when the token opened a quote and never closed it. */
  quoteClosed: boolean;
}

/** Split a capture line while keeping quoted values (and note quotes) intact. */
export function tokenizeCaptureLine(raw: string): CaptureToken[] {
  const tokens: CaptureToken[] = [];
  let rawToken = "";
  let valueToken = "";
  let quote: string | null = null;
  let quoteClosed = true;

  const push = () => {
    if (!rawToken && !valueToken) return;
    tokens.push({ raw: rawToken, value: valueToken, quoteClosed });
    rawToken = "";
    valueToken = "";
    quoteClosed = true;
  };

  for (const char of raw.trim()) {
    if (quote) {
      rawToken += char;
      if (char === quote) {
        quote = null;
        quoteClosed = true;
      } else {
        valueToken += char;
      }
    } else if (char === '"') {
      quote = char;
      quoteClosed = false;
      rawToken += char;
    } else if (/\s/.test(char)) {
      push();
    } else {
      rawToken += char;
      valueToken += char;
    }
  }

  push();
  return tokens;
}

const CAPTURE_COMMANDS = new Set(["project", "tag", "break", "date"]);

function parseCaptureDate(value: string): number {
  const normalized = value.trim().toLowerCase();
  if (normalized === "today") return Date.now();

  if (normalized === "yesterday") {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.getTime();
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new CaptureParseError(
      `Invalid /date value "${value}" (use YYYY-MM-DD, today, or yesterday)`,
    );
  }

  const [year, month, day] = normalized.split("-").map(Number);
  const parsed = new Date();
  parsed.setFullYear(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    throw new CaptureParseError(`Invalid /date value "${value}"`);
  }
  return parsed.getTime();
}

function parseCaptureBreak(value: string): number {
  const match = /^(\d+)(?:d)?$/i.exec(value.trim());
  const days = match ? Number(match[1]) : 0;
  if (!match || days <= 0) {
    throw new CaptureParseError(`Invalid /break value "${value}" (use a positive number of days)`);
  }
  return days;
}

// @unit journals.core.capture-parse
// @summary Parse /project:, /tag:, /date:, and /break: commands from a capture line
export function parseCaptureLine(
  raw: string,
  defaultProject: string | null = "Inbox",
): ParsedCapture {
  const tokens = tokenizeCaptureLine(raw);
  let explicitProject: string | null = null;
  let breakDays = 0;
  let explicitDate: number | null = null;
  const tags: string[] = [];
  const textWords: string[] = [];

  for (const token of tokens) {
    const command = token.raw.startsWith("/") ? /^\/([a-zA-Z]+):(.*)$/s.exec(token.value) : null;
    const type = command?.[1].toLowerCase();

    if (command && type && CAPTURE_COMMANDS.has(type)) {
      if (!token.quoteClosed) {
        throw new CaptureParseError(`Unclosed quote in /${type} command`);
      }

      const value = command[2].trim();
      if (type === "project") {
        if (!value) throw new CaptureParseError("Missing /project value");
        explicitProject = value;
      } else if (type === "tag") {
        if (!value) throw new CaptureParseError("Missing /tag value");
        const tag = value.toLowerCase();
        if (tag.length > 50 || !/^[a-z0-9-_]+$/.test(tag)) {
          throw new CaptureParseError(
            `Invalid /tag value "${value}" (use letters, numbers, hyphens, and underscores)`,
          );
        }
        tags.push(tag);
      } else if (type === "break") {
        breakDays = parseCaptureBreak(value);
      } else {
        explicitDate = parseCaptureDate(value);
      }
      continue;
    }

    textWords.push(token.raw);
  }

  // If a break is requested without an explicit project, it's global (projectName = null)
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
