import { type Config, loadConfig } from "@journals/core";
import type { AppType } from "@journals/server";
import { hc } from "hono/client";

export const config: Config = loadConfig();
export const serverUrl = `http://${config.server.host}:${config.server.port}`;

export const client = hc<AppType>(serverUrl);

export async function fetchEntries() {
  const res = await client.entries.$get();
  const data = await res.json();
  return data.entries;
}

export async function fetchProjects() {
  const res = await client.projects.$get();
  const data = await res.json();
  return data.projects;
}

export async function fetchTags() {
  const res = await client.tags.$get();
  const data = await res.json();
  return data.tags;
}

export async function fetchDashboardAnalytics(days = 60) {
  const res = await fetch(`${serverUrl}/analytics/dashboard?days=${days}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch dashboard: ${res.statusText}`);
  }
  return await res.json();
}

export async function updateProjectApi(
  id: string,
  data: {
    content?: string;
    recurrence?: string | null;
    missedPolicy?: "accumulate" | "spike" | "mark_done";
  },
) {
  const res = await fetch(`${serverUrl}/projects/${id}/content`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error(`Failed to update project: ${res.statusText}`);
  }
  return await res.json();
}

export async function searchEntriesApi(query: string, limit = 50) {
  const res = await client.entries.search.$get({
    query: { q: query, limit: String(limit) },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.entries;
}

export async function searchProjectsApi(query: string, limit = 50) {
  const res = await client.projects.search.$get({
    query: { q: query, limit: String(limit) },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.projects;
}
