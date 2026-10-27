import type { Entry, Project, TagInfo } from "./queries.js";
import type { Tab } from "./useAppKeymaps.js";
import { useModalManager } from "./useModalManager.js";

interface UseAppModalsOptions {
  quickCapture: (raw: string) => Promise<unknown>;
  createProject: (
    name: string,
    recurrence?: string | null,
    missedPolicy?: "accumulate" | "spike" | "mark_done",
  ) => Promise<unknown>;
  updateProject: (
    id: string,
    data: {
      name?: string;
      recurrence?: string | null;
      missedPolicy?: "accumulate" | "spike" | "mark_done";
    },
  ) => Promise<unknown>;
  updateEntryProject: (id: string, projectName: string) => Promise<unknown>;
  updateEntryTags: (id: string, tags: string[]) => Promise<unknown>;
  updateEntryContent: (id: string, content: string) => Promise<unknown>;
  deleteEntry: (id: string) => Promise<unknown>;
  projects: Project[];
  tags: TagInfo[];
  currentTab: Tab;
  selectedEntry?: Entry;
  selectedProject?: Project;
  timelineFilterQuery: string;
  projectsFilterQuery: string;
  onStatusMessage: (message: string) => void;
  onTimelineFilterChange: (query: string) => void;
  onProjectsFilterChange: (query: string) => void;
  onEntryDeleted: (entry: Entry) => void;
}

/**
 * Modal state plus the exact mutations each modal commits. Callers pass the actions, never the
 * whole journal container.
 */

// @unit journals.hooks.modals
// @summary Open capture, project, and entry modals
export function useAppModals({
  quickCapture,
  createProject,
  updateProject,
  updateEntryProject,
  updateEntryTags,
  updateEntryContent,
  deleteEntry,
  projects,
  tags,
  currentTab,
  selectedEntry,
  selectedProject,
  timelineFilterQuery,
  projectsFilterQuery,
  onStatusMessage,
  onTimelineFilterChange,
  onProjectsFilterChange,
  onEntryDeleted,
}: UseAppModalsOptions) {
  // @call journals.hooks.modal-manager Manage the open modal and its input mode
  return useModalManager({
    projects,
    tags,
    currentTab,
    selectedEntry,
    selectedProject,
    timelineFilterQuery,
    projectsFilterQuery,
    quickCapture,
    createProject,
    updateProject,
    updateEntryProject,
    updateEntryTags,
    updateEntryContent,
    deleteEntry,
    onStatusMessage,
    onTimelineFilterChange,
    onProjectsFilterChange,
    onEntryDeleted,
  });
}
