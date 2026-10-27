import { useTerminalDimensions } from "@opentui/react";
import { useState } from "react";
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
// @unit journals.app
// @summary Journals application shell
export function App({ onQuit }: AppProps) {
  const { width = 100, height = 30 } = useTerminalDimensions();
  const [currentTab, setCurrentTab] = useState<Tab>("DASHBOARD");
  const [focusedDayIdx, setFocusedDayIdx] = useState(59);
  const [statusMessage, setStatusMessage] = useState("Ready");
  // @call journals.hooks.data Load entries, projects, tags, and dashboard
  const journalData = useJournalData({ isDashboardActive: currentTab === "DASHBOARD" });
  const { entries, projects, tags, dashboard, loading, isError, error } = journalData;
  // @call journals.hooks.reflection Track the selected reflection period
  const reflection = useReflectionSelection();
  // @call journals.hooks.navigation Filter, select, and navigate entries and projects
  const navigation = useAppNavigation(entries, projects, {
    onNavigateToTimeline: (dateStr) => {
      setCurrentTab("TIMELINE");
      setStatusMessage(`Navigated to timeline for date: ${dateStr}`);
    },
  });
  const { filters, filteredEntries, filteredProjects, entrySelection, projectSelection } =
    navigation;
  // @call journals.hooks.undo Restore a deleted entry
  const { rememberDeleted, undo: undoDelete } = useUndoDelete({
    restoreEntry: journalData.restoreEntry,
    onStatusMessage: setStatusMessage,
  });
  // @call journals.hooks.modals Open capture, project, and entry modals
  const modal = useAppModals({
    quickCapture: journalData.quickCapture,
    createProject: journalData.createProject,
    updateProject: journalData.updateProject,
    updateEntryProject: journalData.updateEntryProject,
    updateEntryTags: journalData.updateEntryTags,
    updateEntryContent: journalData.updateEntryContent,
    deleteEntry: journalData.deleteEntry,
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
  // @call journals.hooks.commands Bind global keymaps and commands
  const selectTab = useAppCommands({
    currentTab,
    setCurrentTab,
    modal,
    filters,
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
        <ErrorState error={error} onRetry={journalData.refetch} />
      ) : (
        <ViewErrorBoundary
          key={currentTab}
          viewName={currentTab.charAt(0) + currentTab.slice(1).toLowerCase()}
        >
          {currentTab === "DASHBOARD" ? (
            // @call journals.views.dashboard Dashboard view: streaks and the activity chart
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
            // @call journals.views.timeline Timeline view: capture, edit, tag, delete
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
            // @call journals.views.reflections Reflections view: weekly to yearly reviews
            <ReflectionsView
              periodType={reflection.periodType}
              onChangePeriodType={reflection.changePeriodType}
              selectedPeriodKey={reflection.selectedPeriodKey}
              onSelectPeriodKey={reflection.selectPeriodKey}
              isActive={!modal.isOpen}
              onStatusMessage={setStatusMessage}
            />
          ) : (
            // @call journals.views.projects Projects view: list, create, edit content
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
