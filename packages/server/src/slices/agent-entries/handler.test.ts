import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { unlinkSync } from "node:fs";
import { eq } from "drizzle-orm";
import { type DatabaseInstance, initDb } from "../../db/client.js";
import { agentEntries, hitLog } from "../../db/schema.js";
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

  it("creates, retrieves, and logs hits with notes", () => {
    const entry1 = createAgentEntry(db, "Run `bun run test` after changes", undefined, "Testing");
    expect(entry1.id).toBeDefined();
    expect(entry1.hitCount).toBe(0);
    expect(entry1.previousEntryId).toBeNull();
    expect(entry1.supersededByEntryId).toBeNull();
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

    incrementAgentEntryHits(db, [entry1.id], "Caught the regression before merge");
    const afterHit = getAgentEntries(db, [entry1.id]);
    expect(afterHit[0].hitCount).toBe(1);
    expect(afterHit[0].hitLogs).toHaveLength(1);
    expect(afterHit[0].hitLogs[0].content).toBe("Caught the regression before merge");
  });

  it("requires a note and rejects unknown ids without writing", () => {
    const entry = createAgentEntry(db, "Some fix", undefined, "Testing");

    expect(() => incrementAgentEntryHits(db, [entry.id], "   ")).toThrow("note is required");
    expect(() => incrementAgentEntryHits(db, [entry.id, "missing"], "Helped")).toThrow(
      "Unknown agent entry id",
    );

    expect(getAgentEntries(db, [entry.id])[0].hitCount).toBe(0);
  });

  it("searches agent entries with FTS5 and boosts high hit counts", () => {
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

    incrementAgentEntryHits(db, [entry1.id], "Fixed the runner");
    incrementAgentEntryHits(db, [entry1.id], "Fixed the runner again");

    const results = searchAgentEntries(db, "linker");
    expect(results.length).toBe(2);
    expect(results[0].id).toBe(entry1.id);
    expect(results[0].hitCount).toBe(2);
    expect(results[0].preview).toBeDefined();
  });

  it("keeps a linear version chain and hides everything but the newest", () => {
    const v1 = createAgentEntry(db, "Stale linker note", undefined, "Troubleshooting");
    const v2 = createAgentEntry(
      db,
      "Consolidated linker note",
      undefined,
      "Troubleshooting",
      v1.id,
    );

    expect(v2.previousEntryId).toBe(v1.id);
    expect(v2.supersededByEntryId).toBeNull();
    expect(getAgentEntries(db, [v1.id])[0].supersededByEntryId).toBe(v2.id);

    expect(listAgentEntries(db).map((entry) => entry.id)).toEqual([v2.id]);
    expect(listAgentEntries(db, undefined, 20, true)).toHaveLength(2);

    expect(searchAgentEntries(db, "linker").map((entry) => entry.id)).toEqual([v2.id]);
    expect(searchAgentEntries(db, "linker", 20, true)).toHaveLength(2);
  });

  it("follows the newest version and refuses to branch from a stale one", () => {
    const v1 = createAgentEntry(db, "Linker note v1", undefined, "Troubleshooting");
    const v2 = createAgentEntry(db, "Linker note v2", undefined, "Troubleshooting", v1.id);
    const v3 = createAgentEntry(db, "Linker note v3", undefined, "Troubleshooting", v2.id);

    expect(v3.previousEntryId).toBe(v2.id);
    expect(getAgentEntries(db, [v2.id])[0].supersededByEntryId).toBe(v3.id);
    expect(listAgentEntries(db).map((entry) => entry.id)).toEqual([v3.id]);

    expect(() =>
      createAgentEntry(db, "Linker note fork", undefined, "Troubleshooting", v1.id),
    ).toThrow("already superseded");
  });

  it("inherits the previous entry's project and refuses cross-project links", () => {
    const old = createAgentEntry(db, "Old note", undefined, "Alpha");
    createAgentEntry(db, "Other note", undefined, "Beta");

    expect(() => createAgentEntry(db, "Bad", undefined, "Beta", old.id)).toThrow("another project");
    expect(() => createAgentEntry(db, "Bad", undefined, "Beta", "missing")).toThrow(
      "Unknown agent entry id",
    );

    const inherited = createAgentEntry(db, "New note", undefined, undefined, old.id);
    expect(inherited.projectName).toBe("Alpha");
    expect(inherited.previousEntryId).toBe(old.id);
  });

  it("cascades hit logs and restores the previous version when the newest is deleted", () => {
    const v1 = createAgentEntry(db, "Old note", undefined, "Testing");
    const v2 = createAgentEntry(db, "New note", undefined, "Testing", v1.id);
    incrementAgentEntryHits(db, [v2.id], "The replacement helped");

    db.delete(agentEntries).where(eq(agentEntries.id, v2.id)).run();

    expect(db.select().from(hitLog).where(eq(hitLog.agentEntryId, v2.id)).all()).toHaveLength(0);
    expect(getAgentEntries(db, [v1.id])[0].supersededByEntryId).toBeNull();
  });
});
