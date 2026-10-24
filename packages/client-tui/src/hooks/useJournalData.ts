import { useQueryClient } from "@tanstack/react-query";
import { client, config, restoreEntryApi, updateProjectApi } from "../api/client.js";
import type { DashboardData, Entry, Project, TagInfo } from "./queries.js";
import { queryKeys, useDashboardAnalytics, useEntries, useProjects, useTags } from "./queries.js";

export type { Entry, Project, TagInfo, DashboardData };

export interface UseJournalDataOptions {
  isDashboardActive?: boolean;
}

export function useJournalData(options: UseJournalDataOptions = {}) {
  const { isDashboardActive = true } = options;
  const queryClient = useQueryClient();

  const entriesQuery = useEntries();
  const projectsQuery = useProjects();
  const tagsQuery = useTags();
  const dashboardQuery = useDashboardAnalytics(60, { enabled: isDashboardActive });

  const entries = entriesQuery.data ?? [];
  const projects = projectsQuery.data ?? [];
  const tags = tagsQuery.data ?? [];
  const dashboard = dashboardQuery.data ?? null;

  const loading = entriesQuery.isLoading || projectsQuery.isLoading || tagsQuery.isLoading;

  async function reloadData() {
    await queryClient.invalidateQueries();
  }

  async function quickCapture(content: string) {
    await client.capture.$post({
      json: {
        raw: content,
        defaultProject: config.quick_add.default_project,
      },
    });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.entries }),
      queryClient.invalidateQueries({ queryKey: queryKeys.projects }),
      queryClient.invalidateQueries({ queryKey: queryKeys.tags }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.reflections.all }),
    ]);
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
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.projects }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
  }

  async function updateProject(
    id: string,
    data: {
      name?: string;
      content?: string;
      recurrence?: string | null;
      missedPolicy?: "accumulate" | "spike" | "mark_done";
    },
  ) {
    await updateProjectApi(id, data);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.projects }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
  }

  async function updateProjectContent(id: string, content: string) {
    await client.projects[":id"].content.$patch({
      param: { id },
      json: { content },
    });
    await queryClient.invalidateQueries({ queryKey: queryKeys.projects });
  }

  async function updateEntryProject(entryId: string, projectName: string) {
    await client.entries[":id"].project.$patch({
      param: { id: entryId },
      json: { projectName },
    });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.entries }),
      queryClient.invalidateQueries({ queryKey: queryKeys.projects }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.reflections.all }),
    ]);
  }

  async function updateEntryTags(entryId: string, newTags: string[]) {
    await client.entries[":id"].tags.$patch({
      param: { id: entryId },
      json: { tags: newTags },
    });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.entries }),
      queryClient.invalidateQueries({ queryKey: queryKeys.tags }),
    ]);
  }

  async function updateEntryContent(entryId: string, content: string) {
    await client.entries[":id"].content.$patch({
      param: { id: entryId },
      json: { content },
    });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.entries }),
      queryClient.invalidateQueries({ queryKey: queryKeys.reflections.all }),
    ]);
  }

  async function deleteEntry(entryId: string) {
    await client.entries[":id"].$delete({
      param: { id: entryId },
    });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.entries }),
      queryClient.invalidateQueries({ queryKey: queryKeys.tags }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.reflections.all }),
    ]);
  }

  async function restoreEntry(entryId: string) {
    await restoreEntryApi(entryId);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.entries }),
      queryClient.invalidateQueries({ queryKey: queryKeys.tags }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.reflections.all }),
    ]);
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
    restoreEntry,
  };
}
