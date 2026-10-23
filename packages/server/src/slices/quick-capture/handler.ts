import crypto from "node:crypto";
import { parseCaptureLine } from "@journals/core";
import type { DatabaseInstance } from "../../db/client.js";
import { entries, entryTags, tags } from "../../db/schema.js";
import { findOrCreateProject } from "../projects/handler.js";

export function handleQuickCapture(
  db: DatabaseInstance,
  raw: string,
  defaultProject = "Inbox",
  defaultTags: string[] = ["quick"],
) {
  const parsed = parseCaptureLine(raw, defaultProject, defaultTags);
  const now = Date.now();

  return db.transaction((tx) => {
    // 1. Get or create project via shared slice helper
    const project = findOrCreateProject(tx, parsed.projectName);

    // 2. Insert Entry
    const entryId = crypto.randomUUID();
    tx.insert(entries)
      .values({
        id: entryId,
        projectId: project.id,
        content: parsed.content || "Empty note",
        createdAt: now,
        updatedAt: now,
      })
      .run();

    // 3. Insert tags and link
    for (const tagName of parsed.tags) {
      tx.insert(tags).values({ name: tagName }).onConflictDoNothing().run();
      tx.insert(entryTags).values({ entryId, tagName }).onConflictDoNothing().run();
    }

    return {
      id: entryId,
      projectId: project.id,
      projectName: project.name,
      content: parsed.content,
      tags: parsed.tags,
      createdAt: now,
    };
  });
}
