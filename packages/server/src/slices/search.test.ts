import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import type { EntrySearchResult, ProjectSearchResult } from "@journals/core";
import { createApp } from "../app.js";
import { type DatabaseInstance, initDb } from "../db/client.js";

const TEST_DB_PATH = path.join(import.meta.dir, "test-search.db");

describe("Search Endpoints (FTS5)", () => {
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

  it("searches journal entries via /entries/search", async () => {
    // 1. Capture some notes
    await app.request("/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        raw: "Discussed SQLite FTS5 full text search indexing /project:Work /tag:meeting",
      }),
    });

    await app.request("/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        raw: "Gym workout and hydration /project:Personal /tag:health",
      }),
    });

    // 2. Query /entries/search?q=SQLite
    const res1 = await app.request("/entries/search?q=SQLite");
    expect(res1.status).toBe(200);
    const data1 = (await res1.json()) as { entries: EntrySearchResult[] };
    expect(data1.entries).toHaveLength(1);
    expect(data1.entries[0].projectName).toBe("Work");
    expect(data1.entries[0].tags).toContain("meeting");
    expect(data1.entries[0].snippet).toContain("<mark>");

    // 3. Query /entries/search with non-matching term
    const res2 = await app.request("/entries/search?q=Kubernetes");
    expect(res2.status).toBe(200);
    const data2 = (await res2.json()) as { entries: EntrySearchResult[] };
    expect(data2.entries).toHaveLength(0);
  });

  it("searches projects via /projects/search", async () => {
    // 1. Create projects
    await app.request("/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "BackendEngine",
        content: "# Backend Engine\nHigh performance TypeScript server with Hono and Bun.",
      }),
    });

    await app.request("/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "FrontendTUI",
        content: "# Frontend TUI\nOpenTUI interactive terminal application with hotkeys.",
      }),
    });

    // 2. Query /projects/search?q=TypeScript
    const res1 = await app.request("/projects/search?q=TypeScript");
    expect(res1.status).toBe(200);
    const data1 = (await res1.json()) as { projects: ProjectSearchResult[] };
    expect(data1.projects).toHaveLength(1);
    expect(data1.projects[0].name).toBe("BackendEngine");
    expect(data1.projects[0].snippet).toContain("<mark>");

    // 3. Query by project name
    const res2 = await app.request("/projects/search?q=FrontendTUI");
    expect(res2.status).toBe(200);
    const data2 = (await res2.json()) as { projects: ProjectSearchResult[] };
    expect(data2.projects).toHaveLength(1);
    expect(data2.projects[0].name).toBe("FrontendTUI");
  });

  it("keeps FTS in sync after entry update and delete", async () => {
    const createRes = await app.request("/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw: "Initial unedited text snippet /project:Demo /tag:draft" }),
    });
    const entry = (await createRes.json()) as { id: string };

    // Update content
    await app.request(`/entries/${entry.id}/content`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Completely revised unique keyword text" }),
    });

    // Old word should not match
    const searchOld = await app.request("/entries/search?q=unedited");
    const dataOld = (await searchOld.json()) as { entries: EntrySearchResult[] };
    expect(dataOld.entries).toHaveLength(0);

    // New word should match
    const searchNew = await app.request("/entries/search?q=revised");
    const dataNew = (await searchNew.json()) as { entries: EntrySearchResult[] };
    expect(dataNew.entries).toHaveLength(1);

    // Delete entry
    await app.request(`/entries/${entry.id}`, { method: "DELETE" });
    const searchAfterDelete = await app.request("/entries/search?q=revised");
    const dataAfterDelete = (await searchAfterDelete.json()) as { entries: EntrySearchResult[] };
    expect(dataAfterDelete.entries).toHaveLength(0);
  });
});
