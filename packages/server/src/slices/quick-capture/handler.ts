import crypto from "node:crypto";
import { parseCaptureLine } from "@journals/core";
import type { DatabaseInstance } from "../../db/client.js";
import { entries, entryTags, tags } from "../../db/schema.js";
import { findOrCreateProject } from "../projects/handler.js";

// @unit journals.server.capture
// @summary Capture a line into an entry
export function handleQuickCapture(
  db: DatabaseInstance,
  raw: string,
  defaultProject: string | null = "Inbox",
) {
  // @call journals.core.capture-parse Parse /project:, /tag:, /date:, and /break: commands
  const parsed = parseCaptureLine(raw, defaultProject);
  const entryTime = parsed.date ?? Date.now();

  return db.transaction((tx) => {
    // 1. Get or create project via shared slice helper (if projectName is not null)
    let project = null;
    if (parsed.projectName) {
      project = findOrCreateProject(tx, parsed.projectName);
    }

    // 2. Insert Entry
    const entryId = crypto.randomUUID();
    tx.insert(entries)
      .values({
        id: entryId,
        projectId: project ? project.id : null,
        content: parsed.content || "Empty note",
        breakDays: parsed.breakDays || 0,
        createdAt: entryTime,
        updatedAt: entryTime,
      })
      .run();

    // 3. Insert tags and link
    for (const tagName of parsed.tags) {
      tx.insert(tags).values({ name: tagName }).onConflictDoNothing().run();
      tx.insert(entryTags).values({ entryId, tagName }).onConflictDoNothing().run();
    }

    return {
      id: entryId,
      projectId: project ? project.id : null,
      projectName: project ? project.name : null,
      content: parsed.content,
      tags: parsed.tags,
      breakDays: parsed.breakDays || 0,
      createdAt: entryTime,
    };
  });
}
