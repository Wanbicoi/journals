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

  it("creates, searches, lists, gets batch, and hits agent entries via HTTP", async () => {
    // 1. Create entry
    const createRes = await app.request("/agent-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content:
          "[episodic] Resolved build failure in packages/client-tui with Bun 1.4\n[procedural] Step 1: Run bun install\nStep 2: Check types",
        projectName: "AgentOps",
      }),
    });
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as { id: string; hitTime: number };
    expect(created.id).toBeDefined();
    expect(created.hitTime).toBe(0);

    // 2. Search entry
    const searchRes = await app.request("/agent-entries/search?q=failure");
    expect(searchRes.status).toBe(200);
    const searchData = (await searchRes.json()) as { entries: Array<{ preview?: string }> };
    expect(searchData.entries).toHaveLength(1);
    expect(searchData.entries[0].preview).toContain("failure");

    // 3. Increment hit
    const hitRes = await app.request("/agent-entries/hit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [created.id] }),
    });
    expect(hitRes.status).toBe(200);

    // 4. Batch get
    const batchRes = await app.request(`/agent-entries/batch?ids=${created.id}`);
    expect(batchRes.status).toBe(200);
    const batchData = (await batchRes.json()) as { entries: Array<{ hitTime: number }> };
    expect(batchData.entries[0].hitTime).toBe(1);

    // 5. List entries
    const listRes = await app.request("/agent-entries");
    expect(listRes.status).toBe(200);
    const listData = (await listRes.json()) as { entries: unknown[] };
    expect(listData.entries).toHaveLength(1);
  });
});
