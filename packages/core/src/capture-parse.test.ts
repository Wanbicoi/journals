import { describe, expect, it } from "bun:test";
import { CaptureParseError, parseCaptureLine, tokenizeCaptureLine } from "./index.js";

describe("parseCaptureLine", () => {
  it("parses project, tags, break, and date commands", () => {
    const parsed = parseCaptureLine(
      "Call dentist /project:health /tag:appointments /tag:urgent /break:2d /date:2025-05-15",
    );

    expect(parsed.content).toBe("Call dentist");
    expect(parsed.projectName).toBe("health");
    expect(parsed.tags).toEqual(["appointments", "urgent"]);
    expect(parsed.breakDays).toBe(2);
    expect(new Date(parsed.date ?? 0).getFullYear()).toBe(2025);
  });

  it("supports quoted multi-word project names", () => {
    const parsed = parseCaptureLine('Call clinic /project:"Health Clinic"');

    expect(parsed.projectName).toBe("Health Clinic");
    expect(parsed.content).toBe("Call clinic");
  });

  it("leaves apostrophes in note text without swallowing later commands", () => {
    const parsed = parseCaptureLine("Don't forget /project:work");

    expect(parsed.content).toBe("Don't forget");
    expect(parsed.projectName).toBe("work");
  });

  it("leaves removed and unknown syntax in the content", () => {
    const parsed = parseCaptureLine("Legacy @health #urgent /foo:bar");

    expect(parsed.projectName).toBe("Inbox");
    expect(parsed.tags).toEqual([]);
    expect(parsed.content).toBe("Legacy @health #urgent /foo:bar");
  });

  it("keeps the last single-value command and accumulates tags", () => {
    const parsed = parseCaptureLine(
      "Note /project:A /project:B /tag:one /tag:two /break:1d /break:3d",
    );

    expect(parsed.projectName).toBe("B");
    expect(parsed.tags).toEqual(["one", "two"]);
    expect(parsed.breakDays).toBe(3);
  });

  it("parses today and yesterday keywords", () => {
    const now = Date.now();
    expect(parseCaptureLine("Note /date:today").date).toBeGreaterThanOrEqual(now - 1000);
    expect(parseCaptureLine("Note /date:yesterday").date).toBeLessThan(now - 20 * 3600 * 1000);
  });

  it("rejects invalid recognized values", () => {
    expect(() => parseCaptureLine("Note /project:")).toThrow(CaptureParseError);
    expect(() => parseCaptureLine("Note /tag:bad!")).toThrow(CaptureParseError);
    expect(() => parseCaptureLine("Note /break:0")).toThrow(CaptureParseError);
    expect(() => parseCaptureLine("Note /date:2026-13-99")).toThrow(CaptureParseError);
    expect(() => parseCaptureLine('Note /project:"unclosed')).toThrow(CaptureParseError);
  });
});

describe("tokenizeCaptureLine", () => {
  it("keeps quotes in raw text but removes them from command values", () => {
    const tokens = tokenizeCaptureLine('He said "hello world" /project:"My Project"');

    expect(tokens[2]?.raw).toBe('"hello world"');
    expect(tokens[3]?.value).toBe("/project:My Project");
  });
});
