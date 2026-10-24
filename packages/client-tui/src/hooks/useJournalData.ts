import { useEffect, useState } from "react";
import {
  client,
  config,
  fetchDashboardAnalytics,
  fetchEntries,
  fetchProjects,
  fetchTags,
  updateProjectApi,
} from "../api/client.js";

export interface Entry {
  id: string;
  projectId: string | null;
  projectName: string | null;
  content: string;
  tags: string[];
  breakDays: number;
  createdAt: number;
}

export interface Project {
  id: string;
  name: string;
  content: string;
  recurrence?: string | null;
  missedPolicy?: string;
  createdAt: number;
  entryCount: number;
}

export interface TagInfo {
  name: string;
  count: number;
}

export interface DashboardData {
  days: {
    date: string;
    timestamp: number;
    entryCount: number;
    breakDaysCount: number;
    dueProjectsCount: number;
    completedProjectsCount: number;
    missedProjectsCount: number;
    missedProjectNames: string[];
  }[];
  status: "NORMAL" | "DEGRADED" | "OUTAGE";
  totalEntries: number;
  totalBreakDays: number;
  activeDebts: {
    projectId: string;
    projectName: string;
    recurrence: string;
    missedPolicy: string;
    accumulatedDebt: number;
    lastJournaledAt: number | null;
  }[];
  activeBreaks: {
    projectName: string | null;
    content: string;
    remainingDays: number;
    startDate: string;
  }[];
}

export function useJournalData() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<TagInfo[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  async function reloadData() {
    try {
      const [entriesData, projectsData, tagsData, dashboardData] = await Promise.all([
        fetchEntries(),
        fetchProjects(),
        fetchTags(),
        fetchDashboardAnalytics(60).catch(() => null),
      ]);
      setEntries((entriesData as Entry[]) || []);
      setProjects((projectsData as Project[]) || []);
      setTags(tagsData || []);
      if (dashboardData) setDashboard(dashboardData);
    } finally {
      setLoading(false);
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: initial fetch on mount
  useEffect(() => {
    reloadData();
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: background polling
  useEffect(() => {
    const timer = setInterval(() => {
      reloadData();
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  async function quickCapture(content: string) {
    await client.capture.$post({
      json: {
        raw: content,
        defaultProject: config.quick_add.default_project,
      },
    });
    await reloadData();
  }

  async function createProject(
    name: string,
    recurrence: string | null = null,
    missedPolicy: "accumulate" | "spike" | "mark_done" = "spike",
  ) {
    await client.projects.$post({
      json: {
        name,
        content: `# Project: ${name}\n\nCreated: ${new Date().toISOString()}`,
        recurrence,
        missedPolicy,
      },
    });
    await reloadData();
  }

  async function updateProject(
    id: string,
    data: {
      content?: string;
      recurrence?: string | null;
      missedPolicy?: "accumulate" | "spike" | "mark_done";
    },
  ) {
    await updateProjectApi(id, data);
    await reloadData();
  }

  async function updateProjectContent(id: string, content: string) {
    await client.projects[":id"].content.$patch({
      param: { id },
      json: { content },
    });
    await reloadData();
  }

  async function updateEntryProject(entryId: string, projectName: string) {
    await client.entries[":id"].project.$patch({
      param: { id: entryId },
      json: { projectName },
    });
    await reloadData();
  }

  async function updateEntryTags(entryId: string, newTags: string[]) {
    await client.entries[":id"].tags.$patch({
      param: { id: entryId },
      json: { tags: newTags },
    });
    await reloadData();
  }

  async function updateEntryContent(entryId: string, content: string) {
    await client.entries[":id"].content.$patch({
      param: { id: entryId },
      json: { content },
    });
    await reloadData();
  }

  async function deleteEntry(entryId: string) {
    await client.entries[":id"].$delete({
      param: { id: entryId },
    });
    await reloadData();
  }

  return {
    entries,
    projects,
    tags,
    dashboard,
    loading,
    reloadData,
    quickCapture,
    createProject,
    updateProject,
    updateProjectContent,
    updateEntryProject,
    updateEntryTags,
    updateEntryContent,
    deleteEntry,
  };
}
