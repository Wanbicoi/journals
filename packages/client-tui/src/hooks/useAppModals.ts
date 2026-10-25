import type { Entry, Project, TagInfo } from "./queries.js";
import type { Tab } from "./useAppKeymaps.js";
import type { useJournalData } from "./useJournalData.js";
import { useModalManager } from "./useModalManager.js";

type JournalActions = Pick<
  ReturnType<typeof useJournalData>,
  | "quickCapture"
  | "createProject"
  | "updateProject"
  | "updateEntryProject"
  | "updateEntryTags"
  | "updateEntryContent"
  | "deleteEntry"
>;

interface UseAppModalsOptions {
  journalActions: JournalActions;
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
 * Modal state plus the exact mutations each modal commits. Callers pass the action slice, never the
 * whole journal container.
 */
export function useAppModals({
  journalActions,
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
  return useModalManager({
    projects,
    tags,
    currentTab,
    selectedEntry,
    selectedProject,
    timelineFilterQuery,
    projectsFilterQuery,
    quickCapture: journalActions.quickCapture,
    createProject: journalActions.createProject,
    updateProject: journalActions.updateProject,
    updateEntryProject: journalActions.updateEntryProject,
    updateEntryTags: journalActions.updateEntryTags,
    updateEntryContent: journalActions.updateEntryContent,
    deleteEntry: journalActions.deleteEntry,
    onStatusMessage,
    onTimelineFilterChange,
    onProjectsFilterChange,
    onEntryDeleted,
  });
}
