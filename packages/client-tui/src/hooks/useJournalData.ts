import { useQueryClient } from "@tanstack/react-query";
import { client, config, restoreEntryApi, updateProjectApi } from "../api/client.js";
import type { DashboardData, Entry, Project, TagInfo } from "./queries.js";
import {
  invalidateAfterMutation,
  invalidationKeys,
  useDashboardAnalytics,
  useEntries,
  useProjects,
  useTags,
} from "./queries.js";

export type { Entry, Project, TagInfo, DashboardData };

export interface UseJournalDataOptions {
  isDashboardActive?: boolean;
}

// @unit journals.hooks.data
// @summary Load the journal's data and mutations
// @details Wraps the query hooks and the write calls into one object, so the
// | app shell reads `journalData` instead of each query separately.
export function useJournalData(options: UseJournalDataOptions = {}) {
  const { isDashboardActive = true } = options;
  const queryClient = useQueryClient();

  // @call journals.hooks.entries Query journal entries
  const entriesQuery = useEntries();
  // @call journals.hooks.projects Query projects
  const projectsQuery = useProjects();
  // @call journals.hooks.tags Query tags
  const tagsQuery = useTags();
  // @call journals.hooks.dashboard Query dashboard analytics
  const dashboardQuery = useDashboardAnalytics(60, { enabled: isDashboardActive });

  const entries = entriesQuery.data ?? [];
  const projects = projectsQuery.data ?? [];
  const tags = tagsQuery.data ?? [];
  const dashboard = dashboardQuery.data ?? null;

  const loading = entriesQuery.isLoading || projectsQuery.isLoading || tagsQuery.isLoading;
  const isError =
    entriesQuery.isError ||
    projectsQuery.isError ||
    tagsQuery.isError ||
    (isDashboardActive && dashboardQuery.isError);
  const error =
    entriesQuery.error ??
    projectsQuery.error ??
    tagsQuery.error ??
    (isDashboardActive ? dashboardQuery.error : null) ??
    null;

  async function reloadData() {
    await queryClient.invalidateQueries();
  }

  async function refetch() {
    await Promise.all([
      entriesQuery.refetch(),
      projectsQuery.refetch(),
      tagsQuery.refetch(),
      isDashboardActive ? dashboardQuery.refetch() : Promise.resolve(),
    ]);
  }

  async function quickCapture(content: string) {
    await client.capture.$post({
      json: {
        raw: content,
        defaultProject: config.quick_add.default_project,
      },
    });
    await invalidateAfterMutation(queryClient, invalidationKeys.capture);
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
    await invalidateAfterMutation(queryClient, invalidationKeys.projectCreated);
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
    await invalidateAfterMutation(queryClient, invalidationKeys.projectUpdated);
  }

  async function updateProjectContent(id: string, content: string) {
    await client.projects[":id"].content.$patch({
      param: { id },
      json: { content },
    });
    await invalidateAfterMutation(queryClient, invalidationKeys.projectContent);
  }

  async function updateEntryProject(entryId: string, projectName: string) {
    await client.entries[":id"].project.$patch({
      param: { id: entryId },
      json: { projectName },
    });
    await invalidateAfterMutation(queryClient, invalidationKeys.entryProject);
  }

  async function updateEntryTags(entryId: string, newTags: string[]) {
    await client.entries[":id"].tags.$patch({
      param: { id: entryId },
      json: { tags: newTags },
    });
    await invalidateAfterMutation(queryClient, invalidationKeys.entryTags);
  }

  async function updateEntryContent(entryId: string, content: string) {
    await client.entries[":id"].content.$patch({
      param: { id: entryId },
      json: { content },
    });
    await invalidateAfterMutation(queryClient, invalidationKeys.entryContent);
  }

  async function deleteEntry(entryId: string) {
    await client.entries[":id"].$delete({
      param: { id: entryId },
    });
    await invalidateAfterMutation(queryClient, invalidationKeys.entryDeleted);
  }

  async function restoreEntry(entryId: string) {
    await restoreEntryApi(entryId);
    await invalidateAfterMutation(queryClient, invalidationKeys.entryDeleted);
  }

  return {
    entries,
    projects,
    tags,
    dashboard,
    loading,
    isError,
    error,
    reloadData,
    refetch,
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
