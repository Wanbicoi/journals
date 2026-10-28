import { desc, eq, inArray, sql } from "drizzle-orm";
import type { DatabaseInstance } from "../../db/client.js";
import { agentEntries, projects } from "../../db/schema.js";
import { sanitizeFtsQuery } from "../../lib/search-utils.js";
import { findOrCreateProject } from "../projects/handler.js";
import { extractContextWindow } from "./utils.js";

export { extractContextWindow };

// @unit journals.server.agent-create
// @summary Log an agent entry
// @details Inserts the note verbatim under the resolved project. The
// | title/Cause/Resolution layout is a convention for agents, not parsed here.
export function createAgentEntry(
  db: DatabaseInstance,
  content: string,
  projectId?: string,
  projectName?: string,
) {
  let targetProjectId = projectId;
  if (!targetProjectId) {
    // @call journals.server.find-or-create-project Find or create the target project
    const p = findOrCreateProject(db, projectName?.trim() || "Agent");
    targetProjectId = p.id;
  }

  const id = crypto.randomUUID();
  const now = Date.now();

  db.insert(agentEntries)
    .values({
      id,
      projectId: targetProjectId,
      content,
      hitTime: 0,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  const project = db
    .select({ name: projects.name })
    .from(projects)
    .where(eq(projects.id, targetProjectId))
    .get();

  return {
    id,
    projectId: targetProjectId,
    projectName: project?.name ?? "Agent",
    content,
    hitTime: 0,
    createdAt: now,
    updatedAt: now,
  };
}

// @unit journals.server.agent-get
// @summary Load entries by id
// @returns Full entries joined with their project name
export function getAgentEntries(db: DatabaseInstance, ids: string[]) {
  if (ids.length === 0) return [];

  return db
    .select({
      id: agentEntries.id,
      projectId: agentEntries.projectId,
      projectName: projects.name,
      content: agentEntries.content,
      hitTime: agentEntries.hitTime,
      createdAt: agentEntries.createdAt,
      updatedAt: agentEntries.updatedAt,
    })
    .from(agentEntries)
    .innerJoin(projects, eq(agentEntries.projectId, projects.id))
    .where(inArray(agentEntries.id, ids))
    .all();
}

// @unit journals.server.agent-list
// @summary List recent entries
// @returns Entries ordered by hit count, then creation time
// @details A project filter is optional; without one the list spans every
// | project, so an agent sees the most reinforced notes first.
export function listAgentEntries(db: DatabaseInstance, projectId?: string, limit = 20) {
  const query = db
    .select({
      id: agentEntries.id,
      projectId: agentEntries.projectId,
      projectName: projects.name,
      content: agentEntries.content,
      hitTime: agentEntries.hitTime,
      createdAt: agentEntries.createdAt,
      updatedAt: agentEntries.updatedAt,
    })
    .from(agentEntries)
    .innerJoin(projects, eq(agentEntries.projectId, projects.id));

  if (projectId) {
    return query
      .where(eq(agentEntries.projectId, projectId))
      .orderBy(desc(agentEntries.hitTime), desc(agentEntries.createdAt))
      .limit(limit)
      .all();
  }

  return query.orderBy(desc(agentEntries.hitTime), desc(agentEntries.createdAt)).limit(limit).all();
}

// @unit journals.server.agent-hit
// @summary Increment the hit counters
// @returns Number of ids that were updated
// @details One UPDATE covers the whole id list and stamps updated_at, so a
// | batch costs a single statement.
export function incrementAgentEntryHits(db: DatabaseInstance, ids: string[]) {
  if (ids.length === 0) return { updated: 0 };

  const now = Date.now();
  db.run(sql`
    UPDATE agent_entries
    SET hit_time = hit_time + 1, updated_at = ${now}
    WHERE id IN ${ids}
  `);

  return { updated: ids.length };
}

/**
 * Searches agent entries with FTS5, boosting rank with hit_time,
 * and generating contextual window preview around matches.
 */

// @unit journals.server.agent-search
// @summary Search agent entries
// @details Ranks with BM25 weighted by (1 + 0.5 × hit_time), so a reinforced
// | entry outranks a fresher but unproven one at the same relevance.
export function searchAgentEntries(db: DatabaseInstance, query: string, limit = 20) {
  // @call journals.server.fts-query Sanitize the FTS5 query
  const ftsQuery = sanitizeFtsQuery(query);
  if (!ftsQuery) {
    return [];
  }

  type AgentFtsRow = {
    id: string;
    projectId: string;
    projectName: string;
    content: string;
    snippet: string;
    hitTime: number;
    createdAt: number;
    updatedAt: number;
    rank: number;
  };

  // bm25 returns negative values in sqlite fts5 where lower is better match.
  // We boost items with higher hit_time by dividing or subtracting bm25.
  // BM25 rank formula: bm25(agent_entries_fts) / (1.0 + log(1.0 + ae.hit_time))
  const rows = db.all(sql`
    SELECT
      ae.id,
      ae.project_id AS projectId,
      p.name AS projectName,
      ae.content,
      snippet(agent_entries_fts, 0, '<mark>', '</mark>', '...', 20) AS snippet,
      ae.hit_time AS hitTime,
      ae.created_at AS createdAt,
      ae.updated_at AS updatedAt,
      (bm25(agent_entries_fts) * (1.0 + (ae.hit_time * 0.5))) AS rank
    FROM agent_entries_fts
    JOIN agent_entries ae ON agent_entries_fts.rowid = ae.rowid
    JOIN projects p ON ae.project_id = p.id
    WHERE agent_entries_fts MATCH ${ftsQuery}
    ORDER BY (bm25(agent_entries_fts) * (1.0 + (ae.hit_time * 0.5))) ASC
    LIMIT ${limit};
  `) as AgentFtsRow[];

  // @call journals.server.agent-preview Build the context preview
  return rows.map((row) => ({
    ...row,
    preview: extractContextWindow(row.content, query),
  }));
}
