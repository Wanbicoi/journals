import { useTerminalDimensions } from "@opentui/react";
import { useCallback, useState } from "react";
import { ErrorState } from "../components/ErrorState.js";
import { ViewErrorBoundary } from "../components/ViewErrorBoundary.js";
import { useAppCommands } from "../hooks/useAppCommands.js";
import type { Tab } from "../hooks/useAppKeymaps.js";
import { useAppModals } from "../hooks/useAppModals.js";
import { useAppNavigation } from "../hooks/useAppNavigation.js";
import { useJournalData } from "../hooks/useJournalData.js";
import { useReflectionSelection } from "../hooks/useReflectionSelection.js";
import { useUndoDelete } from "../hooks/useUndoDelete.js";
import { AppChrome } from "./AppChrome.js";
import { DashboardView } from "./dashboard/DashboardView.js";
import { ProjectsView } from "./projects/ProjectsView.js";
import { ReflectionsView } from "./reflections/ReflectionsView.js";
import { TimelineView } from "./timeline/TimelineView.js";

export interface AppProps {
  onQuit: () => void;
}

export function App({ onQuit }: AppProps) {
  const { width = 100, height = 30 } = useTerminalDimensions();
  const [currentTab, setCurrentTab] = useState<Tab>("DASHBOARD");
  const [focusedDayIdx, setFocusedDayIdx] = useState(59);
  const [statusMessage, setStatusMessage] = useState("Ready");
  const journalData = useJournalData({ isDashboardActive: currentTab === "DASHBOARD" });
  const { entries, projects, tags, dashboard, loading, isError, error } = journalData;
  const reflection = useReflectionSelection();
  const navigation = useAppNavigation(entries, projects, {
    onNavigateToTimeline: (dateStr) => {
      setCurrentTab("TIMELINE");
      setStatusMessage(`Navigated to timeline for date: ${dateStr}`);
    },
  });
  const { filters, filteredEntries, filteredProjects, entrySelection, projectSelection } =
    navigation;
  const { rememberDeleted, undo: undoDelete } = useUndoDelete({
    restoreEntry: journalData.restoreEntry,
    onStatusMessage: setStatusMessage,
  });
  const modal = useAppModals({
    journalActions: journalData,
    projects,
    tags,
    currentTab,
    selectedEntry: entrySelection.selected,
    selectedProject: projectSelection.selected,
    timelineFilterQuery: filters.timelineFilterQuery,
    projectsFilterQuery: filters.projectsFilterQuery,
    onStatusMessage: setStatusMessage,
    onTimelineFilterChange: navigation.changeTimelineFilter,
    onProjectsFilterChange: navigation.changeProjectsFilter,
    onEntryDeleted: (entry) => {
      rememberDeleted(entry);
      navigation.selectPreviousEntry();
    },
  });
  const selectTab = useCallback((tab: Tab) => {
    setCurrentTab(tab);
    setStatusMessage(`${tab.charAt(0) + tab.slice(1).toLowerCase()} View`);
  }, []);
  useAppCommands({
    currentTab,
    modal,
    filters,
    onSelectTab: selectTab,
    onQuit,
    reloadData: journalData.reloadData,
    onStatusMessage: setStatusMessage,
  });
  return (
    <AppChrome
      width={width}
      height={height}
      currentTab={currentTab}
      statusMessage={statusMessage}
      filterQuery={
        currentTab === "TIMELINE" ? filters.timelineFilterQuery : filters.projectsFilterQuery
      }
      modal={modal}
      selectedEntry={entrySelection.selected}
      selectedProject={projectSelection.selected}
      onSelectTab={selectTab}
    >
      {isError ? (
        <ErrorState error={error} />
      ) : (
        <ViewErrorBoundary
          key={currentTab}
          viewName={currentTab.charAt(0) + currentTab.slice(1).toLowerCase()}
        >
          {currentTab === "DASHBOARD" ? (
            <DashboardView
              dashboard={dashboard}
              projects={projects}
              loading={loading}
              focusedDayIdx={focusedDayIdx}
              onFocusDayIdx={setFocusedDayIdx}
              onNavigateDate={navigation.navigateToDate}
              onQuickCapture={journalData.quickCapture}
              onStatusMessage={setStatusMessage}
              isActive={!modal.isOpen}
            />
          ) : currentTab === "TIMELINE" ? (
            <TimelineView
              entries={filteredEntries}
              selectedEntryIdx={Math.max(0, entrySelection.selectedIndex)}
              onSelectEntry={entrySelection.selectIndex}
              filterQuery={filters.timelineFilterQuery}
              loading={loading}
              isActive={!modal.isOpen}
              onStatusMessage={setStatusMessage}
              onQuickCapture={modal.openCapture}
              onEditContent={modal.openEditContent}
              onEditProject={modal.openEditProject}
              onEditTags={modal.openEditTags}
              onDeleteEntry={modal.openDeleteConfirm}
              onUndoDelete={undoDelete}
              onUpdateEntryContent={journalData.updateEntryContent}
            />
          ) : currentTab === "REFLECTIONS" ? (
            <ReflectionsView
              periodType={reflection.periodType}
              onChangePeriodType={reflection.changePeriodType}
              selectedPeriodIdx={reflection.selectedPeriodIdx}
              onSelectPeriodIdx={reflection.selectPeriodIdx}
              isActive={!modal.isOpen}
              onStatusMessage={setStatusMessage}
            />
          ) : (
            <ProjectsView
              projects={filteredProjects}
              selectedProjectIdx={Math.max(0, projectSelection.selectedIndex)}
              onSelectProject={projectSelection.selectIndex}
              entries={entries}
              filterQuery={filters.projectsFilterQuery}
              isActive={!modal.isOpen}
              onStatusMessage={setStatusMessage}
              onNewProject={modal.openNewProject}
              onEditProjectSettings={modal.openEditProjectSettings}
              onUpdateProjectContent={journalData.updateProjectContent}
            />
          )}
        </ViewErrorBoundary>
      )}
    </AppChrome>
  );
}
