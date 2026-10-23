import { describe, expect, test } from "bun:test";
import { initDb } from "../../db/client.js";
import {
  createProject,
  findOrCreateProject,
  listProjects,
  updateProjectContent,
} from "./handler.js";

describe("Projects Slice", () => {
  test("creates, lists, and updates project content", () => {
    const db = initDb(":memory:", false);

    // Initial empty
    expect(listProjects(db)).toEqual([]);

    // Create project
    const created = createProject(db, "Work", "# Work Plan");
    expect(created.name).toBe("Work");
    expect(created.content).toBe("# Work Plan");

    // Update content
    const updated = updateProjectContent(db, created.id, "# Work Plan (Updated)");
    expect(updated?.content).toBe("# Work Plan (Updated)");

    // List projects includes entryCount
    const all = listProjects(db);
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe("Work");
    expect(all[0].entryCount).toBe(0);
  });

  test("findOrCreateProject returns existing or creates new", () => {
    const db = initDb(":memory:", false);

    const first = findOrCreateProject(db, "Ideas");
    const second = findOrCreateProject(db, "Ideas");

    expect(first.id).toBe(second.id);
    expect(first.name).toBe("Ideas");
  });
});
