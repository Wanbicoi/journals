import { describe, expect, test } from "bun:test";
import { initDb } from "../../db/client.js";
import { handleQuickCapture } from "../quick-capture/handler.js";
import { listTags } from "./handler.js";

describe("Tags Slice", () => {
  test("aggregates tag counts and supports prefix search", () => {
    const db = initDb(":memory:", false);

    // Initial empty
    expect(listTags(db)).toEqual([]);

    // Seed tags via capture
    handleQuickCapture(db, "Task 1 #backend #perf");
    handleQuickCapture(db, "Task 2 #backend #security");

    // Deliberate initial failing expectation for TDD Red phase
    const tags = listTags(db);
    expect(tags).toEqual([
      { name: "backend", count: 2 },
      { name: "perf", count: 1 },
      { name: "security", count: 1 },
    ]);

    // Prefix search
    const filtered = listTags(db, "per");
    expect(filtered).toEqual([{ name: "perf", count: 1 }]);
  });
});
