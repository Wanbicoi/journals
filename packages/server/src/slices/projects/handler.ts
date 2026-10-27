import crypto from "node:crypto";
import { count, desc, eq, sql } from "drizzle-orm";
import type { DatabaseInstance } from "../../db/client.js";
import { entries, projects } from "../../db/schema.js";
import { sanitizeFtsQuery } from "../../lib/search-utils.js";

type DbOrTx = DatabaseInstance | Parameters<Parameters<DatabaseInstance["transaction"]>[0]>[0];

// @unit journals.server.list-projects
// @summary List projects
export function listProjects(db: DbOrTx) {
  const projs = db
    .select({
      id: projects.id,
      name: projects.name,
      content: projects.content,
      recurrence: projects.recurrence,
      missedPolicy: projects.missedPolicy,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      entryCount: count(entries.id),
    })
    .from(projects)
    .leftJoin(entries, eq(projects.id, entries.projectId))
    .groupBy(projects.id)
    .orderBy(desc(projects.updatedAt))
    .all();

  return projs;
}

export function findOrCreateProject(db: DbOrTx, name: string) {
  const cleanName = name.trim();
  let [project] = db.select().from(projects).where(eq(projects.name, cleanName)).all();
  if (!project) {
    const id = crypto.randomUUID();
    const now = Date.now();
    db.insert(projects)
      .values({
        id,
        name: cleanName,
        content: `# ${cleanName}\n`,
        recurrence: null,
        missedPolicy: "spike",
        createdAt: now,
        updatedAt: now,
      })
      .run();
    project = {
      id,
      name: cleanName,
      content: `# ${cleanName}\n`,
      recurrence: null,
      missedPolicy: "spike",
      createdAt: now,
      updatedAt: now,
    };
  }
  return project;
}

// @unit journals.server.create-project
// @summary Create a project
export function createProject(
  db: DbOrTx,
  name: string,
  content = "",
  recurrence: string | null = null,
  missedPolicy = "spike",
) {
  const id = crypto.randomUUID();
  const now = Date.now();
  db.insert(projects)
    .values({
      id,
      name,
      content,
      recurrence,
      missedPolicy,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return { id, name, content, recurrence, missedPolicy, createdAt: now, updatedAt: now };
}

// @unit journals.server.update-project
// @summary Edit project content and recurrence
export function updateProject(
  db: DbOrTx,
  id: string,
  data: { name?: string; content?: string; recurrence?: string | null; missedPolicy?: string },
) {
  const now = Date.now();
  const updateData: Record<string, unknown> = { updatedAt: now };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.content !== undefined) updateData.content = data.content;
  if (data.recurrence !== undefined) updateData.recurrence = data.recurrence;
  if (data.missedPolicy !== undefined) updateData.missedPolicy = data.missedPolicy;

  db.update(projects).set(updateData).where(eq(projects.id, id)).run();
  return { id, ...data, updatedAt: now };
}

export function updateProjectContent(db: DbOrTx, id: string, content: string) {
  return updateProject(db, id, { content });
}

// @unit journals.server.search-projects
// @summary Search projects
export function searchProjects(db: DatabaseInstance, query: string, limit = 50) {
  const ftsQuery = sanitizeFtsQuery(query);
  if (!ftsQuery) {
    return [];
  }

  type ProjectFtsRow = {
    id: string;
    name: string;
    content: string;
    snippet: string;
    entryCount: number;
    createdAt: number;
    updatedAt: number;
    rank: number;
  };

  const rows = db.all(sql`
    SELECT
      p.id,
      p.name,
      p.content,
      snippet(projects_fts, -1, '<mark>', '</mark>', '...', 15) AS snippet,
      (SELECT COUNT(e.id) FROM entries e WHERE e.project_id = p.id) AS entryCount,
      p.created_at AS createdAt,
      p.updated_at AS updatedAt,
      bm25(projects_fts) AS rank
    FROM projects_fts
    JOIN projects p ON projects_fts.rowid = p.rowid
    WHERE projects_fts MATCH ${ftsQuery}
    ORDER BY bm25(projects_fts)
    LIMIT ${limit};
  `) as ProjectFtsRow[];

  return rows;
}
