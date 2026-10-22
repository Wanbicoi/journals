import { desc, eq } from "drizzle-orm";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import type { DatabaseInstance } from "../../db/client.js";
import { entries, projects } from "../../db/schema.js";
import { findOrCreateProject } from "../projects/handler.js";

export function listEntries(db: DatabaseInstance, sqlite: BetterSqliteDatabase) {
  const allEntries = db
    .select({
      id: entries.id,
      projectId: entries.projectId,
      projectName: projects.name,
      content: entries.content,
      isQuickCapture: entries.isQuickCapture,
      createdAt: entries.createdAt,
      updatedAt: entries.updatedAt,
    })
    .from(entries)
    .innerJoin(projects, eq(entries.projectId, projects.id))
    .orderBy(desc(entries.createdAt))
    .all();

  // Attach tags
  return allEntries.map((entry) => {
    const entryTagRows = sqlite
      .prepare("SELECT tag_name FROM entry_tags WHERE entry_id = ?")
      .all(entry.id) as { tag_name: string }[];
    return {
      ...entry,
      tags: entryTagRows.map((r) => r.tag_name),
    };
  });
}

export function updateEntryProject(
  db: DatabaseInstance,
  sqlite: BetterSqliteDatabase,
  entryId: string,
  projectName: string,
) {
  return sqlite.transaction(() => {
    const project = findOrCreateProject(db, projectName);

    db.update(entries)
      .set({ projectId: project.id, updatedAt: Date.now() })
      .where(eq(entries.id, entryId))
      .run();

    return { success: true, projectId: project.id, projectName: project.name };
  })();
}

export function updateEntryTags(sqlite: BetterSqliteDatabase, entryId: string, newTags: string[]) {
  return sqlite.transaction(() => {
    sqlite.prepare("DELETE FROM entry_tags WHERE entry_id = ?").run(entryId);
    for (const tag of newTags) {
      const cleanTag = tag.trim().toLowerCase();
      if (!cleanTag) continue;
      sqlite.prepare("INSERT OR IGNORE INTO tags (name) VALUES (?)").run(cleanTag);
      sqlite
        .prepare("INSERT INTO entry_tags (entry_id, tag_name) VALUES (?, ?)")
        .run(entryId, cleanTag);
    }
    return { success: true, tags: newTags };
  })();
}
