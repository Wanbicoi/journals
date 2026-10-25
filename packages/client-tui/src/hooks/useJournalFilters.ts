import { useCallback, useState } from "react";
import type { Tab } from "./useAppKeymaps.js";

/**
 * The two screen filters are one UI machine: changing a tab decides which one Escape clears.
 */
export function useJournalFilters() {
  const [timelineFilterQuery, setTimelineFilterQuery] = useState("");
  const [projectsFilterQuery, setProjectsFilterQuery] = useState("");

  const clearForTab = useCallback(
    (tab: Tab) => {
      if (tab === "TIMELINE" && timelineFilterQuery) {
        setTimelineFilterQuery("");
        return true;
      }
      if (tab === "PROJECTS" && projectsFilterQuery) {
        setProjectsFilterQuery("");
        return true;
      }
      return false;
    },
    [projectsFilterQuery, timelineFilterQuery],
  );

  return {
    timelineFilterQuery,
    projectsFilterQuery,
    setTimelineFilterQuery,
    setProjectsFilterQuery,
    clearForTab,
  };
}
