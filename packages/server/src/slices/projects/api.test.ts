import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { createApp } from "../../app.js";
import { type DatabaseInstance, initDb } from "../../db/client.js";
import { entries } from "../../db/schema.js";

const TEST_DB_PATH = path.join(import.meta.dir, "test-projects-api.db");

describe("Projects HTTP Endpoints", () => {
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

  it("soft-deletes a project and hides its journal and agent entries", async () => {
    const createRes = await app.request("/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Work" }),
    });
    const project = (await createRes.json()) as { id: string };

    await app.request("/agent-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Work note", projectName: "Work" }),
    });

    const now = Date.now();
    db.insert(entries)
      .values({
        id: "entry-1",
        projectId: project.id,
        content: "Work journal",
        createdAt: now,
        updatedAt: now,
      })
      .run();

    expect(
      ((await (await app.request("/entries")).json()) as { entries: unknown[] }).entries,
    ).toHaveLength(1);

    const deleteRes = await app.request(`/projects/${project.id}`, { method: "DELETE" });
    expect(deleteRes.status).toBe(200);

    expect(
      ((await (await app.request("/projects")).json()) as { projects: unknown[] }).projects,
    ).toHaveLength(0);
    expect(
      ((await (await app.request("/entries")).json()) as { entries: unknown[] }).entries,
    ).toHaveLength(0);
    expect(
      ((await (await app.request("/agent-entries")).json()) as { entries: unknown[] }).entries,
    ).toHaveLength(0);
    expect(
      ((await (await app.request("/projects/search?q=work")).json()) as { projects: unknown[] })
        .projects,
    ).toHaveLength(0);

    // Recreating the project with the same name revives the row and its hidden entries.
    const reviveRes = await app.request("/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Work" }),
    });
    expect(((await reviveRes.json()) as { id: string }).id).toBe(project.id);
    expect(
      ((await (await app.request("/entries")).json()) as { entries: unknown[] }).entries,
    ).toHaveLength(1);

    const agentList = (await (await app.request("/agent-entries")).json()) as {
      entries: unknown[];
    };
    expect(agentList.entries).toHaveLength(1);
  });
});
