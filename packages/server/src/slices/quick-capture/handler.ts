import crypto from "node:crypto";
import { parseCaptureLine } from "@journals/core";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import type { DatabaseInstance } from "../../db/client.js";
import { entries } from "../../db/schema.js";
import { findOrCreateProject } from "../projects/handler.js";

export function handleQuickCapture(
  db: DatabaseInstance,
  sqlite: BetterSqliteDatabase,
  raw: string,
  defaultProject = "Inbox",
  defaultTags: string[] = ["quick"],
) {
  const parsed = parseCaptureLine(raw, defaultProject, defaultTags);
  const now = Date.now();

  const runTx = sqlite.transaction(() => {
    // 1. Get or create project via shared slice helper
    const project = findOrCreateProject(db, parsed.projectName);

    // 2. Insert Entry
    const entryId = crypto.randomUUID();
    db.insert(entries)
      .values({
        id: entryId,
        projectId: project.id,
        content: parsed.content || "Empty note",
        isQuickCapture: true,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    // 3. Insert tags and link
    for (const tagName of parsed.tags) {
      sqlite.prepare("INSERT OR IGNORE INTO tags (name) VALUES (?)").run(tagName);
      sqlite
        .prepare("INSERT OR IGNORE INTO entry_tags (entry_id, tag_name) VALUES (?, ?)")
        .run(entryId, tagName);
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

  return runTx();
}
