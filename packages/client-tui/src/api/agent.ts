import type { AgentEntry, AgentEntrySearchResult } from "@journals/core";
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

export async function createAgentEntryApi(
  content: string,
  projectName?: string,
  projectId?: string,
): Promise<AgentEntry> {
  const res = await rpc["agent-entries"].$post({
    json: { content, projectName, projectId },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create agent entry (${res.status}): ${text}`);
  }
  return res.json();
}

export async function searchAgentEntriesApi(
  query: string,
  limit = 20,
): Promise<{ entries: AgentEntrySearchResult[] }> {
  const res = await rpc["agent-entries"].search.$get({
    query: { q: query, limit: String(limit) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to search agent entries (${res.status}): ${text}`);
  }
  return res.json();
}

export async function getAgentEntriesBatchApi(ids: string[]): Promise<{ entries: AgentEntry[] }> {
  const res = await rpc["agent-entries"].batch.$get({
    query: { ids: ids.join(",") },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch agent entries (${res.status}): ${text}`);
  }
  return res.json();
}

export async function incrementAgentHitsApi(ids: string[]): Promise<{ updated: number }> {
  const res = await rpc["agent-entries"].hit.$post({
    json: { ids },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to update hit count (${res.status}): ${text}`);
  }
  return res.json();
}

export async function listAgentEntriesApi(
  projectId?: string,
  limit = 20,
): Promise<{ entries: AgentEntry[] }> {
  const queryParam: Record<string, string> = { limit: String(limit) };
  if (projectId) queryParam.projectId = projectId;

  const res = await rpc["agent-entries"].$get({
    query: queryParam,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to list agent entries (${res.status}): ${text}`);
  }
  return res.json();
}
