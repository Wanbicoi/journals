import crypto from "node:crypto";
import { count, desc, eq } from "drizzle-orm";
import type { DatabaseInstance } from "../../db/client.js";
import { entries, projects } from "../../db/schema.js";

export function listProjects(db: DatabaseInstance) {
  const projs = db
    .select({
      id: projects.id,
      name: projects.name,
      content: projects.content,
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

export function createProject(db: DatabaseInstance, name: string, content = "") {
  const id = crypto.randomUUID();
  const now = Date.now();
  db.insert(projects)
    .values({
      id,
      name,
      content,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return { id, name, content, createdAt: now, updatedAt: now };
}

export function updateProjectContent(db: DatabaseInstance, id: string, content: string) {
  const now = Date.now();
  db.update(projects).set({ content, updatedAt: now }).where(eq(projects.id, id)).run();
  return { id, content, updatedAt: now };
}
