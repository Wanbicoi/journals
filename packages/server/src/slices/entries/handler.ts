import { desc, eq, inArray } from "drizzle-orm";
import type { DatabaseInstance } from "../../db/client.js";
import { entries, entryTags, projects, tags } from "../../db/schema.js";
import { findOrCreateProject } from "../projects/handler.js";

export function listEntries(db: DatabaseInstance) {
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

  if (allEntries.length === 0) {
    return [];
  }

  // Batch load tags for all entries to prevent N+1 queries
  const entryIds = allEntries.map((e) => e.id);
  const tagRows = db
    .select({
      entryId: entryTags.entryId,
      tagName: entryTags.tagName,
    })
    .from(entryTags)
    .where(inArray(entryTags.entryId, entryIds))
    .all();

  const tagsByEntryId = new Map<string, string[]>();
  for (const row of tagRows) {
    const list = tagsByEntryId.get(row.entryId) || [];
    list.push(row.tagName);
    tagsByEntryId.set(row.entryId, list);
  }

  return allEntries.map((entry) => ({
    ...entry,
    tags: tagsByEntryId.get(entry.id) || [],
  }));
}

export function updateEntryProject(db: DatabaseInstance, entryId: string, projectName: string) {
  return db.transaction((tx) => {
    const project = findOrCreateProject(tx, projectName);

    tx.update(entries)
      .set({ projectId: project.id, updatedAt: Date.now() })
      .where(eq(entries.id, entryId))
      .run();

    return { success: true, projectId: project.id, projectName: project.name };
  });
}

export function updateEntryTags(db: DatabaseInstance, entryId: string, newTags: string[]) {
  return db.transaction((tx) => {
    tx.delete(entryTags).where(eq(entryTags.entryId, entryId)).run();
    for (const tag of newTags) {
      const cleanTag = tag.trim().toLowerCase();
      if (!cleanTag) continue;
      tx.insert(tags).values({ name: cleanTag }).onConflictDoNothing().run();
      tx.insert(entryTags).values({ entryId, tagName: cleanTag }).onConflictDoNothing().run();
    }
    return { success: true, tags: newTags };
  });
}

export function updateEntryContent(db: DatabaseInstance, entryId: string, content: string) {
  db.update(entries).set({ content, updatedAt: Date.now() }).where(eq(entries.id, entryId)).run();
  return { success: true, id: entryId, content };
}

export function deleteEntry(db: DatabaseInstance, entryId: string) {
  return db.transaction((tx) => {
    tx.delete(entryTags).where(eq(entryTags.entryId, entryId)).run();
    tx.delete(entries).where(eq(entries.id, entryId)).run();
    return { success: true, id: entryId };
  });
}
