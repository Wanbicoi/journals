import { describe, expect, test } from "bun:test";
import { initDb } from "../../db/client.js";
import { handleQuickCapture } from "../quick-capture/handler.js";
import {
  deleteEntry,
  listEntries,
  restoreEntry,
  updateEntryContent,
  updateEntryProject,
  updateEntryTags,
} from "./handler.js";

describe("Entries Slice", () => {
  test("manages entries lifecycle (list, update content/project/tags, delete, restore)", () => {
    const db = initDb(":memory:", false);

    // Initial empty
    expect(listEntries(db)).toEqual([]);

    // Seed entry using quick capture
    const captured = handleQuickCapture(db, "Finish presentation /project:Work /tag:prep");

    expect(captured.content).toBe("Finish presentation");
    const entryId = captured.id;

    // Verify listed
    const all = listEntries(db);
    expect(all).toHaveLength(1);
    expect(all[0].content).toBe("Finish presentation");
    expect(all[0].projectName).toBe("Work");
    expect(all[0].tags).toEqual(["prep"]);

    // Update content
    const updatedContent = updateEntryContent(db, entryId, "Finish presentation v2");
    expect(updatedContent.success).toBe(true);
    expect(updatedContent.content).toBe("Finish presentation v2");

    // Update project
    const updatedProj = updateEntryProject(db, entryId, "Personal");
    expect(updatedProj.success).toBe(true);
    expect(updatedProj.projectName).toBe("Personal");

    // Update tags
    const updatedTags = updateEntryTags(db, entryId, ["slides", "keynote"]);
    expect(updatedTags.success).toBe(true);
    expect(updatedTags.tags).toEqual(["slides", "keynote"]);

    // Soft delete
    const deleted = deleteEntry(db, entryId);
    expect(deleted.success).toBe(true);
    expect(listEntries(db)).toHaveLength(0);

    // Restore from trash
    const restored = restoreEntry(db, entryId);
    expect(restored.success).toBe(true);
    const afterRestore = listEntries(db);
    expect(afterRestore).toHaveLength(1);
    expect(afterRestore[0].id).toBe(entryId);
  });
});
