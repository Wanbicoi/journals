import { describe, expect, test } from "bun:test";
import { initDb } from "../../db/client.js";
import { handleQuickCapture } from "./handler.js";

describe("Quick Capture Slice", () => {
  test("creates entry, creates project if not exists, and attaches tags", () => {
    const db = initDb(":memory:", false);
    const result = handleQuickCapture(db, "Call dentist @health #appointments #urgent");

    expect(result.projectName).toBe("health");
    expect(result.content).toBe("Call dentist");
    expect(result.tags).toEqual(["appointments", "urgent"]);
    expect(typeof result.id).toBe("string");
    expect(typeof result.projectId).toBe("string");
  });

  test("uses defaultProject and defaultTags when not supplied in raw string", () => {
    const db = initDb(":memory:", false);
    const result = handleQuickCapture(db, "Simple thought without tags or project");

    expect(result.projectName).toBe("Inbox");
    expect(result.tags).toEqual(["quick"]);
    expect(result.content).toBe("Simple thought without tags or project");
  });
});
