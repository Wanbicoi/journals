import type { AgentEntryDetail } from "@journals/core";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { DatabaseInstance } from "../../db/client.js";
import { agentEntries, hitLog, projects } from "../../db/schema.js";
import { sanitizeFtsQuery } from "../../lib/search-utils.js";
import { findOrCreateProject } from "../projects/handler.js";
import { extractContextWindow } from "./utils.js";

export { extractContextWindow };

export class AgentEntryError extends Error {}

const entryColumns = {
  id: agentEntries.id,
  projectId: agentEntries.projectId,
  projectName: projects.name,
  content: agentEntries.content,
  hitCount: sql<number>`(SELECT COUNT(*) FROM hit_log WHERE hit_log.agent_entry_id = ${agentEntries.id})`,
  previousEntryId: agentEntries.previousAgentEntryId,
  supersededByEntryId: sql<
    string | null
  >`(SELECT successor.id FROM agent_entries successor WHERE successor.previous_agent_entry_id = ${agentEntries.id} LIMIT 1)`,
  createdAt: agentEntries.createdAt,
  updatedAt: agentEntries.updatedAt,
};

function missingIds(found: string[], requested: string[]): string[] {
  const known = new Set(found);
  return requested.filter((id) => !known.has(id));
}

// @unit journals.server.agent-previous
// @summary Validate the previous version
// @details History is linear: the predecessor must exist, and no other entry
// | may already point at it. Superseding a stale version is rejected with a
// | pointer to the current one.
function resolvePreviousEntry(db: DatabaseInstance, previousEntryId: string) {
  const previous = db
    .select({ id: agentEntries.id, projectId: agentEntries.projectId })
    .from(agentEntries)
    .where(eq(agentEntries.id, previousEntryId))
    .get();

  if (!previous) {
    throw new AgentEntryError(`Unknown agent entry id: ${previousEntryId}`);
  }

  const successor = db
    .select({ id: agentEntries.id })
    .from(agentEntries)
    .where(eq(agentEntries.previousAgentEntryId, previousEntryId))
    .get();

  if (successor) {
    throw new AgentEntryError(
      `Agent entry ${previousEntryId} is already superseded by ${successor.id}; supersede the newest version.`,
    );
  }

  return previous;
}

// @unit journals.server.agent-create
// @summary Log an agent entry
// @details Inserts the note verbatim under the resolved project. The
// | title/Cause/Resolution layout is a convention for agents, not parsed here.
// | A replacement cites exactly one previous version, so history stays linear.
export function createAgentEntry(
  db: DatabaseInstance,
  content: string,
  projectId?: string,
  projectName?: string,
  previousEntryId?: string,
): AgentEntryDetail {
  const id = crypto.randomUUID();
  const now = Date.now();

  let previous: { id: string; projectId: string } | undefined;
  if (previousEntryId) {
    // @call journals.server.agent-previous Validate the previous version
    previous = resolvePreviousEntry(db, previousEntryId);
  }

  let targetProjectId = projectId;
  if (!targetProjectId) {
    if (!projectName && previous) {
      targetProjectId = previous.projectId;
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
    throw new AgentEntryError(`Unknown project: ${targetProjectId}`);
  }

  if (previous && previous.projectId !== targetProjectId) {
    throw new AgentEntryError("Cannot supersede an entry from another project.");
  }

  db.insert(agentEntries)
    .values({
      id,
      projectId: targetProjectId,
      content,
      previousAgentEntryId: previous?.id ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return {
    id,
    projectId: targetProjectId,
    projectName: project.name,
    content,
    hitCount: 0,
    previousEntryId: previous?.id ?? null,
    supersededByEntryId: null,
    createdAt: now,
    updatedAt: now,
    hitLogs: [],
  };
}

// @unit journals.server.agent-get
// @summary Load entries by id
// @returns Full entries joined with their project name and hit logs
// @details Supersession is derived in both directions: `previousEntryId` walks
// | back one version, `supersededByEntryId` points at the successor, if any.
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

  return entries.map((entry) => ({
    ...entry,
    hitLogs: logs.filter((log) => log.agentEntryId === entry.id),
  }));
}

// @unit journals.server.agent-list
// @summary List recent entries
// @returns Entries ordered by hit count, then creation time
// @details A project filter is optional; without one the list spans every
// | project. Only the newest version of each chain is shown unless
// | includeSuperseded is set.
export function listAgentEntries(
  db: DatabaseInstance,
  projectId?: string,
  limit = 20,
  includeSuperseded = false,
) {
  const filters = [];
  if (projectId) filters.push(eq(agentEntries.projectId, projectId));
  if (!includeSuperseded) {
    filters.push(
      sql`NOT EXISTS (SELECT 1 FROM agent_entries successor WHERE successor.previous_agent_entry_id = ${agentEntries.id})`,
    );
  }

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
    throw new AgentEntryError("A hit note is required.");
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
    throw new AgentEntryError(`Unknown agent entry id(s): ${missing.join(", ")}`);
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
// | entry outranks a fresher but unproven one at the same relevance. Only the
// | newest version of each chain is searched unless includeSuperseded is set.
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
    previousEntryId: string | null;
    supersededByEntryId: string | null;
    createdAt: number;
    updatedAt: number;
    rank: number;
  };

  const staleFilter = includeSuperseded
    ? sql``
    : sql`AND NOT EXISTS (SELECT 1 FROM agent_entries successor WHERE successor.previous_agent_entry_id = ae.id)`;

  const rows = db.all(sql`
    SELECT
      ae.id,
      ae.project_id AS projectId,
      p.name AS projectName,
      ae.content,
      snippet(agent_entries_fts, 0, '<mark>', '</mark>', '...', 20) AS snippet,
      (SELECT COUNT(*) FROM hit_log hl WHERE hl.agent_entry_id = ae.id) AS hitCount,
      ae.previous_agent_entry_id AS previousEntryId,
      (SELECT successor.id FROM agent_entries successor WHERE successor.previous_agent_entry_id = ae.id LIMIT 1) AS supersededByEntryId,
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
