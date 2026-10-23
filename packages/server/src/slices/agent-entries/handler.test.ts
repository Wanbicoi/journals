import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { unlinkSync } from "node:fs";
import { type DatabaseInstance, initDb } from "../../db/client.js";
import {
  createAgentEntry,
  getAgentEntries,
  incrementAgentEntryHits,
  listAgentEntries,
  searchAgentEntries,
} from "./handler.js";

const TEST_DB = "/tmp/journals-agent-entries-test.sqlite";

describe("Agent Entries Slice", () => {
  let db: DatabaseInstance;

  beforeEach(() => {
    try {
      unlinkSync(TEST_DB);
    } catch {}
    db = initDb(TEST_DB);
  });

  afterEach(() => {
    try {
      unlinkSync(TEST_DB);
    } catch {}
  });

  it("creates, retrieves, and increments hits on agent entries", () => {
    const entry1 = createAgentEntry(db, "Run `bun run test` after changes", undefined, "Testing");
    expect(entry1.id).toBeDefined();
    expect(entry1.hitTime).toBe(0);
    expect(entry1.projectName).toBe("Testing");

    const entry2 = createAgentEntry(
      db,
      "Deploy failure troubleshooting: inspect Docker container exit code 137 OOM",
      undefined,
      "DevOps",
    );

    const listed = listAgentEntries(db);
    expect(listed.length).toBe(2);

    const batch = getAgentEntries(db, [entry1.id, entry2.id]);
    expect(batch.length).toBe(2);

    incrementAgentEntryHits(db, [entry1.id]);
    const afterHit = getAgentEntries(db, [entry1.id]);
    expect(afterHit[0].hitTime).toBe(1);
  });

  it("searches agent entries with FTS5 and boosts high hit_time entries", () => {
    const entry1 = createAgentEntry(
      db,
      "Resolution for NixOS glibc dynamic linker error when running binary",
      undefined,
      "Troubleshooting",
    );
    createAgentEntry(
      db,
      "General linker issue explanation on Linux distros",
      undefined,
      "Troubleshooting",
    );

    // Bump hit_time for entry1 so it gets prioritized
    incrementAgentEntryHits(db, [entry1.id, entry1.id, entry1.id]);

    const results = searchAgentEntries(db, "linker");
    expect(results.length).toBe(2);
    expect(results[0].id).toBe(entry1.id);
    expect(results[0].preview).toBeDefined();
  });
});
