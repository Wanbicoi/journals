import { describe, expect, test } from "bun:test";
import { initDb } from "../../db/client.js";
import {
  createProject,
  deleteProject,
  findOrCreateProject,
  listProjects,
  restoreProject,
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

  test("soft-deletes a project, hides it, and revives it by name", () => {
    const db = initDb(":memory:", false);
    const project = createProject(db, "Work", "# Work Plan");

    deleteProject(db, project.id);
    expect(listProjects(db)).toEqual([]);

    // Reusing the name through the create path revives the same row and document.
    const revived = createProject(db, "Work", "# Replacement");
    expect(revived.id).toBe(project.id);
    expect(revived.content).toBe("# Work Plan");
    expect(listProjects(db).map((row) => row.id)).toEqual([project.id]);

    // The find-or-create path revives it too.
    deleteProject(db, project.id);
    expect(findOrCreateProject(db, "Work").id).toBe(project.id);

    // Restore is explicit too.
    deleteProject(db, project.id);
    restoreProject(db, project.id);
    expect(listProjects(db).map((row) => row.id)).toEqual([project.id]);
  });
});
