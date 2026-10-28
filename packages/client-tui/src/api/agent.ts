import type { AgentEntry, AgentEntryDetail, AgentEntrySearchResult } from "@journals/core";
import { client } from "./client.js";

// Helper accessor for dynamically routed agent-entries slice on Hono client
type DynamicClient = Record<
  string,
  {
    $post: (arg: unknown) => Promise<Response>;
    $get: (arg: unknown) => Promise<Response>;
    search: { $get: (arg: unknown) => Promise<Response> };
    batch: { $get: (arg: unknown) => Promise<Response> };
    hit: { $post: (arg: unknown) => Promise<Response> };
  }
>;
const rpc = client as unknown as DynamicClient;

async function requestError(res: Response, prefix: string): Promise<Error> {
  const text = await res.text();
  let message = text;
  try {
    const body = JSON.parse(text) as { error?: string };
    if (body.error) message = body.error;
  } catch {}
  return new Error(`${prefix} (${res.status}): ${message}`);
}

// @unit journals.api.agent.create
// @summary Create an agent entry over HTTP
// @returns Created entry
// @details Posts the whole note as one content string, plus the id of the
// | version it replaces; the server resolves the project and links the chain.
export async function createAgentEntryApi(
  content: string,
  projectName?: string,
  projectId?: string,
  previousEntryId?: string,
): Promise<AgentEntryDetail> {
  // @call journals.server.agent-create Log an agent entry
  const res = await rpc["agent-entries"].$post({
    json: { content, projectName, projectId, previousEntryId },
  });
  if (!res.ok) {
    throw await requestError(res, "Failed to create agent entry");
  }
  return res.json();
}

// @unit journals.api.agent.search
// @summary Search agent entries over HTTP
// @returns Ranked matches with snippets and previews
export async function searchAgentEntriesApi(
  query: string,
  limit = 20,
  includeSuperseded = false,
): Promise<{ entries: AgentEntrySearchResult[] }> {
  // @call journals.server.agent-search Search the FTS5 index
  const res = await rpc["agent-entries"].search.$get({
    query: {
      q: query,
      limit: String(limit),
      includeSuperseded: String(includeSuperseded),
    },
  });
  if (!res.ok) {
    throw await requestError(res, "Failed to search agent entries");
  }
  return res.json();
}

// @unit journals.api.agent.show
// @summary Fetch agent entries by id over HTTP
// @returns Full entries with hit logs and supersession links
export async function getAgentEntriesBatchApi(ids: string[]): Promise<{
  entries: AgentEntryDetail[];
}> {
  // @call journals.server.agent-get Load the entries by id
  const res = await rpc["agent-entries"].batch.$get({
    query: { ids: ids.join(",") },
  });
  if (!res.ok) {
    throw await requestError(res, "Failed to fetch agent entries");
  }
  return res.json();
}

// @unit journals.api.agent.hit
// @summary Log a hit over HTTP
// @returns Number of ids the server logged
export async function incrementAgentHitsApi(
  ids: string[],
  content: string,
): Promise<{ updated: number }> {
  // @call journals.server.agent-hit Write the hit log
  const res = await rpc["agent-entries"].hit.$post({
    json: { ids, content },
  });
  if (!res.ok) {
    throw await requestError(res, "Failed to log hit");
  }
  return res.json();
}

// @unit journals.api.agent.list
// @summary List agent entries over HTTP
// @returns Entries ordered by hits, then recency
export async function listAgentEntriesApi(
  projectId?: string,
  limit = 20,
  includeSuperseded = false,
): Promise<{ entries: AgentEntry[] }> {
  const queryParam: Record<string, string> = {
    limit: String(limit),
    includeSuperseded: String(includeSuperseded),
  };
  if (projectId) queryParam.projectId = projectId;

  // @call journals.server.agent-list Read the recent entries
  const res = await rpc["agent-entries"].$get({
    query: queryParam,
  });
  if (!res.ok) {
    throw await requestError(res, "Failed to list agent entries");
  }
  return res.json();
}
