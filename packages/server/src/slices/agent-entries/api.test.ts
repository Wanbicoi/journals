import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { createApp } from "../../app.js";
import { type DatabaseInstance, initDb } from "../../db/client.js";

const TEST_DB_PATH = path.join(import.meta.dir, "test-agent-api.db");

describe("Agent Entries HTTP Endpoints", () => {
  let db: DatabaseInstance;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    db = initDb(TEST_DB_PATH, false);
    app = createApp(db);
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  it("creates, searches, lists, gets batch, and logs hits via HTTP", async () => {
    // 1. Create entry
    const createRes = await app.request("/agent-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content:
          "Build failure in packages/client-tui with Bun 1.4\nCause: stale lockfile — Bun 1.4 changed the lockfile format\nResolution: Run bun install, then check types",
        projectName: "AgentOps",
      }),
    });
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as {
      id: string;
      hitCount: number;
      supersededByEntryId: string | null;
    };
    expect(created.id).toBeDefined();
    expect(created.hitCount).toBe(0);
    expect(created.supersededByEntryId).toBeNull();

    // 2. Search entry
    const searchRes = await app.request("/agent-entries/search?q=failure");
    expect(searchRes.status).toBe(200);
    const searchData = (await searchRes.json()) as {
      entries: Array<{ preview?: string; hitCount: number }>;
    };
    expect(searchData.entries).toHaveLength(1);
    expect(searchData.entries[0].preview).toContain("failure");
    expect(searchData.entries[0].hitCount).toBe(0);

    // 3. Log a hit with its required note
    const hitRes = await app.request("/agent-entries/hit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [created.id], content: "Cleared the lockfile issue" }),
    });
    expect(hitRes.status).toBe(200);

    // 4. Batch get returns the derived count and the hit log
    const batchRes = await app.request(`/agent-entries/batch?ids=${created.id}`);
    expect(batchRes.status).toBe(200);
    const batchData = (await batchRes.json()) as {
      entries: Array<{
        hitCount: number;
        hitLogs: Array<{ content: string }>;
        supersedes: string[];
      }>;
    };
    expect(batchData.entries[0].hitCount).toBe(1);
    expect(batchData.entries[0].hitLogs[0]?.content).toBe("Cleared the lockfile issue");
    expect(batchData.entries[0].supersedes).toEqual([]);

    // 5. List entries
    const listRes = await app.request("/agent-entries");
    expect(listRes.status).toBe(200);
    const listData = (await listRes.json()) as { entries: unknown[] };
    expect(listData.entries).toHaveLength(1);
  });

  it("rejects a hit without a note", async () => {
    const createRes = await app.request("/agent-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Some note", projectName: "AgentOps" }),
    });
    const created = (await createRes.json()) as { id: string };

    const hitRes = await app.request("/agent-entries/hit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [created.id], content: "   " }),
    });
    expect(hitRes.status).toBe(400);
  });

  it("hides superseded entries unless asked for them", async () => {
    const create = async (content: string, supersedes: string[] = []) => {
      const res = await app.request("/agent-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, projectName: "AgentOps", supersedes }),
      });
      return (await res.json()) as { id: string; supersedes: string[] };
    };

    const old = await create("Stale linker note");
    const replacement = await create("Consolidated linker note", [old.id]);
    expect(replacement.supersedes).toEqual([old.id]);

    const defaultList = (await (await app.request("/agent-entries")).json()) as {
      entries: Array<{ id: string }>;
    };
    expect(defaultList.entries.map((entry) => entry.id)).toEqual([replacement.id]);

    const allList = (await (await app.request("/agent-entries?includeSuperseded=true")).json()) as {
      entries: Array<{ id: string }>;
    };
    expect(allList.entries).toHaveLength(2);

    const defaultSearch = (await (await app.request("/agent-entries/search?q=linker")).json()) as {
      entries: Array<{ id: string }>;
    };
    expect(defaultSearch.entries.map((entry) => entry.id)).toEqual([replacement.id]);

    const allSearch = (await (
      await app.request("/agent-entries/search?q=linker&includeSuperseded=true")
    ).json()) as { entries: Array<{ id: string }> };
    expect(allSearch.entries).toHaveLength(2);
  });
});
