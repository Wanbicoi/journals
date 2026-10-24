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
    name?: string;
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

export async function restoreEntryApi(id: string) {
  const res = await fetch(`${serverUrl}/entries/${id}/restore`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error(`Failed to restore entry: ${res.statusText}`);
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

export async function fetchPeriodsApi(periodType: "WEEK" | "MONTH" | "QUARTER" | "YEAR") {
  const res = await client.reflections[":periodType"].$get({
    param: { periodType },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data as { periods: import("@journals/core").PeriodItemStatus[] }).periods;
}

export async function fetchPeriodDetailApi(
  periodType: "WEEK" | "MONTH" | "QUARTER" | "YEAR",
  periodKey: string,
) {
  const res = await client.reflections[":periodType"][":periodKey"].$get({
    param: { periodType, periodKey },
  });
  if (!res.ok) return null;
  return (await res.json()) as import("@journals/core").PeriodDetail;
}

export async function saveReflectionApi(
  periodType: "WEEK" | "MONTH" | "QUARTER" | "YEAR",
  periodKey: string,
  content: string,
) {
  const res = await client.reflections[":periodType"][":periodKey"].$put({
    param: { periodType, periodKey },
    json: { content },
  });
  if (!res.ok) throw new Error("Failed to save reflection");
  return await res.json();
}
