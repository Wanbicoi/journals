import crypto from "node:crypto";
import { desc, eq } from "drizzle-orm";
import type { DatabaseInstance } from "../../db/client.js";
import { entries, entryTags, projects, tags } from "../../db/schema.js";

export function listEntries(db: DatabaseInstance, sqlite: any) {
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
  sqlite: any,
  entryId: string,
  projectName: string,
) {
  return sqlite.transaction(() => {
    let [project] = db.select().from(projects).where(eq(projects.name, projectName)).all();
    if (!project) {
      const newProjectId = crypto.randomUUID();
      const now = Date.now();
      db.insert(projects)
        .values({
          id: newProjectId,
          name: projectName,
          content: `# ${projectName}\n`,
          createdAt: now,
          updatedAt: now,
        })
        .run();
      project = {
        id: newProjectId,
        name: projectName,
        content: "",
        createdAt: now,
        updatedAt: now,
      };
    }

    db.update(entries)
      .set({ projectId: project.id, updatedAt: Date.now() })
      .where(eq(entries.id, entryId))
      .run();

    return { success: true, projectId: project.id, projectName: project.name };
  })();
}

export function updateEntryTags(sqlite: any, entryId: string, newTags: string[]) {
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
