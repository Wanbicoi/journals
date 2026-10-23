import { type Config, loadConfig } from "@journals/core";
import type { AppType } from "@journals/server";
import { hc } from "hono/client";
import { startDaemon } from "../daemon.js";

export const config: Config = loadConfig();
export const serverUrl = `http://${config.server.host}:${config.server.port}`;

try {
  const testRes = await fetch(`${serverUrl}/health`);
  if (!testRes.ok) throw new Error("not running");
} catch {
  if (config.server.auto_start) {
    await startDaemon(config);
  }
}

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
