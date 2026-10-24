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

  test("uses defaultProject and empty tags when not supplied in raw string", () => {
    const db = initDb(":memory:", false);
    const result = handleQuickCapture(db, "Simple thought without tags or project");

    expect(result.projectName).toBe("Inbox");
    expect(result.tags).toEqual([]);
    expect(result.content).toBe("Simple thought without tags or project");
  });

  test("parses /yesterday and /date overrides", () => {
    const db = initDb(":memory:", false);
    const yesterdayRes = handleQuickCapture(db, "Retro note /yesterday @work");
    const now = Date.now();
    // Yesterday should be ~24h in the past
    expect(yesterdayRes.createdAt).toBeLessThan(now - 20 * 3600 * 1000);
    expect(yesterdayRes.content).toBe("Retro note");

    const dateRes = handleQuickCapture(db, "Old memory /date:2025-05-15 @journal #memory");
    const d = new Date(dateRes.createdAt);
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(4); // 0-indexed May
    expect(d.getDate()).toBe(15);
    expect(dateRes.content).toBe("Old memory");
    expect(dateRes.tags).toEqual(["memory"]);
  });
});
