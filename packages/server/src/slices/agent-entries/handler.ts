import type { AgentEntryDetail } from "@journals/core";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { DatabaseInstance } from "../../db/client.js";
import { agentEntries, hitLog, projects } from "../../db/schema.js";
import { sanitizeFtsQuery } from "../../lib/search-utils.js";
import { findOrCreateProject } from "../projects/handler.js";
import { extractContextWindow } from "./utils.js";

export { extractContextWindow };

type DbOrTx = DatabaseInstance | Parameters<Parameters<DatabaseInstance["transaction"]>[0]>[0];

const entryColumns = {
  id: agentEntries.id,
  projectId: agentEntries.projectId,
  projectName: projects.name,
  content: agentEntries.content,
  hitCount: sql<number>`(SELECT COUNT(*) FROM hit_log WHERE hit_log.agent_entry_id = ${agentEntries.id})`,
  supersededByEntryId: agentEntries.supersededByAgentEntryId,
  createdAt: agentEntries.createdAt,
  updatedAt: agentEntries.updatedAt,
};

function missingIds(found: string[], requested: string[]): string[] {
  const known = new Set(found);
  return requested.filter((id) => !known.has(id));
}

// @unit journals.server.agent-supersede
// @summary Retire the superseded entries
// @details Points every old row at the replacement without touching its
// | content or updated_at, so history stays intact and last writer wins.
function supersedeAgentEntries(db: DbOrTx, replacementId: string, ids: string[]) {
  db.update(agentEntries)
    .set({ supersededByAgentEntryId: replacementId })
    .where(inArray(agentEntries.id, ids))
    .run();
}

// @unit journals.server.agent-create
// @summary Log an agent entry
// @details Inserts the note verbatim under the resolved project. The
// | title/Cause/Resolution layout is a convention for agents, not parsed here.
export function createAgentEntry(
  db: DatabaseInstance,
  content: string,
  projectId?: string,
  projectName?: string,
  supersedes: string[] = [],
): AgentEntryDetail {
  const uniqueSupersedes = [...new Set(supersedes)];
  const id = crypto.randomUUID();
  const now = Date.now();

  let supersededRows: Array<{ id: string; projectId: string }> = [];
  if (uniqueSupersedes.length > 0) {
    supersededRows = db
      .select({ id: agentEntries.id, projectId: agentEntries.projectId })
      .from(agentEntries)
      .where(inArray(agentEntries.id, uniqueSupersedes))
      .all();

    const missing = missingIds(
      supersededRows.map((row) => row.id),
      uniqueSupersedes,
    );
    if (missing.length > 0) {
      throw new Error(`Unknown agent entry id(s): ${missing.join(", ")}`);
    }
  }

  let targetProjectId = projectId;
  if (!targetProjectId) {
    if (!projectName && supersededRows.length > 0) {
      targetProjectId = supersededRows[0].projectId;
    } else {
      // @call journals.server.find-or-create-project Find or create the target project
      const project = findOrCreateProject(db, projectName?.trim() || "Agent");
      targetProjectId = project.id;
    }
  }

  const project = db
    .select({ name: projects.name })
    .from(projects)
    .where(eq(projects.id, targetProjectId))
    .get();
  if (!project) {
    throw new Error(`Unknown project: ${targetProjectId}`);
  }

  if (supersededRows.some((row) => row.projectId !== targetProjectId)) {
    throw new Error("Cannot supersede entries from another project.");
  }

  // @call journals.server.agent-supersede Retire the superseded entries
  db.transaction((tx) => {
    tx.insert(agentEntries)
      .values({
        id,
        projectId: targetProjectId,
        content,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    if (uniqueSupersedes.length > 0) {
      supersedeAgentEntries(tx, id, uniqueSupersedes);
    }
  });

  return {
    id,
    projectId: targetProjectId,
    projectName: project.name,
    content,
    hitCount: 0,
    supersededByEntryId: null,
    createdAt: now,
    updatedAt: now,
    hitLogs: [],
    supersedes: uniqueSupersedes,
  };
}

// @unit journals.server.agent-get
// @summary Load entries by id
// @returns Full entries joined with their project name, hit logs, and links
// @details Supersession is read in both directions: who replaced this entry
// | and which entries this one replaced.
export function getAgentEntries(db: DatabaseInstance, ids: string[]): AgentEntryDetail[] {
  if (ids.length === 0) return [];

  const entries = db
    .select(entryColumns)
    .from(agentEntries)
    .innerJoin(projects, eq(agentEntries.projectId, projects.id))
    .where(inArray(agentEntries.id, ids))
    .all();

  if (entries.length === 0) return [];

  const logs = db
    .select({
      id: hitLog.id,
      agentEntryId: hitLog.agentEntryId,
      content: hitLog.content,
      createdAt: hitLog.createdAt,
    })
    .from(hitLog)
    .where(inArray(hitLog.agentEntryId, ids))
    .orderBy(desc(hitLog.createdAt), desc(sql`rowid`))
    .all();

  const replaced = db
    .select({ id: agentEntries.id, supersededBy: agentEntries.supersededByAgentEntryId })
    .from(agentEntries)
    .where(inArray(agentEntries.supersededByAgentEntryId, ids))
    .all();

  return entries.map((entry) => ({
    ...entry,
    hitLogs: logs.filter((log) => log.agentEntryId === entry.id),
    supersedes: replaced.filter((row) => row.supersededBy === entry.id).map((row) => row.id),
  }));
}

// @unit journals.server.agent-list
// @summary List recent entries
// @returns Entries ordered by hit count, then creation time
// @details A project filter is optional; without one the list spans every
// | project. Superseded entries stay hidden unless includeSuperseded is set.
export function listAgentEntries(
  db: DatabaseInstance,
  projectId?: string,
  limit = 20,
  includeSuperseded = false,
) {
  const filters = [];
  if (projectId) filters.push(eq(agentEntries.projectId, projectId));
  if (!includeSuperseded) filters.push(isNull(agentEntries.supersededByAgentEntryId));

  const query = db
    .select(entryColumns)
    .from(agentEntries)
    .innerJoin(projects, eq(agentEntries.projectId, projects.id));

  if (filters.length > 0) query.where(and(...filters));

  return query
    .orderBy(desc(entryColumns.hitCount), desc(agentEntries.createdAt))
    .limit(limit)
    .all();
}

// @unit journals.server.agent-hit
// @summary Log a hit
// @returns Number of entries that received a hit log row
// @details Writes one row per distinct id with the same timestamp. The note is
// | required, and an unknown id fails the whole batch before anything is written.
export function incrementAgentEntryHits(db: DatabaseInstance, ids: string[], content: string) {
  const note = content.trim();
  if (!note) {
    throw new Error("A hit note is required.");
  }

  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return { updated: 0 };

  const existing = db
    .select({ id: agentEntries.id })
    .from(agentEntries)
    .where(inArray(agentEntries.id, uniqueIds))
    .all();

  const missing = missingIds(
    existing.map((row) => row.id),
    uniqueIds,
  );
  if (missing.length > 0) {
    throw new Error(`Unknown agent entry id(s): ${missing.join(", ")}`);
  }

  const now = Date.now();
  db.transaction((tx) => {
    for (const agentEntryId of uniqueIds) {
      tx.insert(hitLog)
        .values({
          id: crypto.randomUUID(),
          agentEntryId,
          content: note,
          createdAt: now,
        })
        .run();
    }
  });

  return { updated: uniqueIds.length };
}

/**
 * Searches agent entries with FTS5, boosting rank with the derived hit count,
 * and generating contextual window preview around matches.
 */

// @unit journals.server.agent-search
// @summary Search agent entries
// @details Ranks with BM25 weighted by (1 + 0.5 × hit count), so a reinforced
// | entry outranks a fresher but unproven one at the same relevance. Superseded
// | entries are excluded unless includeSuperseded is set.
export function searchAgentEntries(
  db: DatabaseInstance,
  query: string,
  limit = 20,
  includeSuperseded = false,
) {
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
    hitCount: number;
    supersededByEntryId: string | null;
    createdAt: number;
    updatedAt: number;
    rank: number;
  };

  const staleFilter = includeSuperseded ? sql`` : sql`AND ae.superseded_by_agent_entry_id IS NULL`;

  const rows = db.all(sql`
    SELECT
      ae.id,
      ae.project_id AS projectId,
      p.name AS projectName,
      ae.content,
      snippet(agent_entries_fts, 0, '<mark>', '</mark>', '...', 20) AS snippet,
      (SELECT COUNT(*) FROM hit_log hl WHERE hl.agent_entry_id = ae.id) AS hitCount,
      ae.superseded_by_agent_entry_id AS supersededByEntryId,
      ae.created_at AS createdAt,
      ae.updated_at AS updatedAt,
      (bm25(agent_entries_fts) * (1.0 + ((SELECT COUNT(*) FROM hit_log hits WHERE hits.agent_entry_id = ae.id) * 0.5))) AS rank
    FROM agent_entries_fts
    JOIN agent_entries ae ON agent_entries_fts.rowid = ae.rowid
    JOIN projects p ON ae.project_id = p.id
    WHERE agent_entries_fts MATCH ${ftsQuery}
      ${staleFilter}
    ORDER BY rank ASC
    LIMIT ${limit};
  `) as AgentFtsRow[];

  // @call journals.server.agent-preview Build the context preview
  return rows.map((row) => ({
    ...row,
    preview: extractContextWindow(row.content, query),
  }));
}
