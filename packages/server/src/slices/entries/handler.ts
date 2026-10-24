import { desc, eq, inArray, sql } from "drizzle-orm";
import type { DatabaseInstance } from "../../db/client.js";
import { entries, entryTags, projects, tags } from "../../db/schema.js";
import { sanitizeFtsQuery } from "../../lib/search-utils.js";
import { findOrCreateProject } from "../projects/handler.js";

export function listEntries(db: DatabaseInstance) {
  const allEntries = db
    .select({
      id: entries.id,
      projectId: entries.projectId,
      projectName: projects.name,
      content: entries.content,
      breakDays: entries.breakDays,
      createdAt: entries.createdAt,
      updatedAt: entries.updatedAt,
    })
    .from(entries)
    .leftJoin(projects, eq(entries.projectId, projects.id))
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

export function updateEntryProject(
  db: DatabaseInstance,
  entryId: string,
  projectName: string | null | undefined,
) {
  return db.transaction((tx) => {
    let projectId: string | null = null;
    let projName: string | null = null;
    if (projectName) {
      const project = findOrCreateProject(tx, projectName);
      projectId = project.id;
      projName = project.name;
    }

    tx.update(entries)
      .set({ projectId, updatedAt: Date.now() })
      .where(eq(entries.id, entryId))
      .run();

    return { success: true, projectId, projectName: projName };
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

export function updateEntryContent(
  db: DatabaseInstance,
  entryId: string,
  content: string,
  breakDays?: number,
) {
  const updateData: Record<string, unknown> = { content, updatedAt: Date.now() };
  if (breakDays !== undefined) {
    updateData.breakDays = breakDays;
  }
  db.update(entries).set(updateData).where(eq(entries.id, entryId)).run();
  return { success: true, id: entryId, content, breakDays };
}

export function deleteEntry(db: DatabaseInstance, entryId: string) {
  return db.transaction((tx) => {
    tx.delete(entryTags).where(eq(entryTags.entryId, entryId)).run();
    tx.delete(entries).where(eq(entries.id, entryId)).run();
    return { success: true, id: entryId };
  });
}

export function searchEntries(db: DatabaseInstance, query: string, limit = 50) {
  const ftsQuery = sanitizeFtsQuery(query);
  if (!ftsQuery) {
    return [];
  }

  type EntryFtsRow = {
    id: string;
    projectId: string;
    projectName: string;
    content: string;
    snippet: string;
    createdAt: number;
    updatedAt: number;
    rank: number;
  };

  const rows = db.all(sql`
    SELECT
      e.id,
      e.project_id AS projectId,
      p.name AS projectName,
      e.content,
      snippet(entries_fts, 0, '<mark>', '</mark>', '...', 15) AS snippet,
      e.created_at AS createdAt,
      e.updated_at AS updatedAt,
      bm25(entries_fts) AS rank
    FROM entries_fts
    JOIN entries e ON entries_fts.rowid = e.rowid
    JOIN projects p ON e.project_id = p.id
    WHERE entries_fts MATCH ${ftsQuery}
    ORDER BY bm25(entries_fts)
    LIMIT ${limit};
  `) as EntryFtsRow[];

  if (rows.length === 0) {
    return [];
  }

  const entryIds = rows.map((r) => r.id);
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

  return rows.map((r) => ({
    ...r,
    tags: tagsByEntryId.get(r.id) || [],
  }));
}
