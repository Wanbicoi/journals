import { useCallback } from "react";
import { filterEntries, filterProjects } from "./filterJournal.js";
import type { Entry, Project } from "./queries.js";
import { useJournalFilters } from "./useJournalFilters.js";
import { useSelectionById } from "./useSelection.js";

interface UseAppNavigationOptions {
  onNavigateToTimeline: (dateStr: string) => void;
}

/**
 * Filtering, selection identity, and the date jump are the screen's navigation machine.
 */

// @unit journals.hooks.navigation
// @summary Filter, select, and navigate entries and projects
export function useAppNavigation(
  entries: Entry[],
  projects: Project[],
  { onNavigateToTimeline }: UseAppNavigationOptions,
) {
  // @call journals.hooks.filters Filter entries and projects by query
  const filters = useJournalFilters();
  const filteredEntries = filterEntries(entries, filters.timelineFilterQuery);
  const filteredProjects = filterProjects(projects, filters.projectsFilterQuery);
  // @call journals.hooks.selection Keep the selected entry by id
  const entrySelection = useSelectionById(filteredEntries);
  // @call journals.hooks.selection Keep the selected project by id
  const projectSelection = useSelectionById(filteredProjects);

  const navigateToDate = useCallback(
    (dateStr: string) => {
      filters.setTimelineFilterQuery(dateStr);
      entrySelection.clear();
      onNavigateToTimeline(dateStr);
    },
    [entrySelection.clear, filters.setTimelineFilterQuery, onNavigateToTimeline],
  );

  const changeTimelineFilter = useCallback(
    (query: string) => {
      filters.setTimelineFilterQuery(query);
      entrySelection.clear();
    },
    [entrySelection.clear, filters.setTimelineFilterQuery],
  );

  const changeProjectsFilter = useCallback(
    (query: string) => {
      filters.setProjectsFilterQuery(query);
      projectSelection.clear();
    },
    [filters.setProjectsFilterQuery, projectSelection.clear],
  );

  const selectPreviousEntry = useCallback(() => {
    const previous = filteredEntries[Math.max(0, entrySelection.selectedIndex - 1)];
    entrySelection.select(previous);
  }, [entrySelection, filteredEntries]);

  return {
    filters,
    filteredEntries,
    filteredProjects,
    entrySelection,
    projectSelection,
    navigateToDate,
    changeTimelineFilter,
    changeProjectsFilter,
    selectPreviousEntry,
  };
}
