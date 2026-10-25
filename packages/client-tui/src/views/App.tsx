import type { ReflectionPeriodType } from "@journals/core";
import { useTerminalDimensions } from "@opentui/react";
import { useCallback, useState } from "react";
import { config } from "../api/client.js";
import { ErrorState } from "../components/ErrorState.js";
import { Header } from "../components/Header.js";
import { StatusBar } from "../components/StatusBar.js";
import type { Tab } from "../hooks/useAppKeymaps.js";
import { useAppKeymaps } from "../hooks/useAppKeymaps.js";
import { useJournalData } from "../hooks/useJournalData.js";
import { useMouseClick } from "../hooks/useMouseClick.js";
import { useSelectionById } from "../hooks/useSelection.js";
import { useSelectionClipboard } from "../hooks/useSelectionClipboard.js";
import { useUndoDelete } from "../hooks/useUndoDelete.js";
import { getTheme } from "../theme.js";
import { DashboardView } from "./dashboard/DashboardView.js";
import { ActiveModal } from "./modals/ActiveModal.js";
import { useModalManager } from "./modals/useModalManager.js";
import { ProjectsView } from "./projects/ProjectsView.js";
import { ReflectionsView } from "./reflections/ReflectionsView.js";
import { TimelineView } from "./timeline/TimelineView.js";

export interface AppProps {
  onQuit: () => void;
}

export function App({ onQuit }: AppProps) {
  const { width = 100, height = 30 } = useTerminalDimensions();
  const icons = config.appearance.use_nerd_font ? config.icons.nerd : config.icons.plain;
  const theme = getTheme(config.appearance.theme);

  const [currentTab, setCurrentTab] = useState<Tab>("DASHBOARD");
  const journalData = useJournalData({ isDashboardActive: currentTab === "DASHBOARD" });
  const {
    entries,
    projects,
    tags,
    dashboard,
    loading,
    isError,
    error,
    reloadData,
    restoreEntry,
    updateEntryContent,
    updateProjectContent,
  } = journalData;

  const [reflectionPeriodType, setReflectionPeriodType] = useState<ReflectionPeriodType>("WEEK");
  const [selectedPeriodIdx, setSelectedPeriodIdx] = useState(0);
  const [timelineFilterQuery, setTimelineFilterQuery] = useState("");
  const [projectsFilterQuery, setProjectsFilterQuery] = useState("");
  const [focusedDayIdx, setFocusedDayIdx] = useState(59);
  const [statusMessage, setStatusMessage] = useState("Ready");

  const filteredEntries = entries.filter((e) => {
    if (!timelineFilterQuery) return true;
    const q = timelineFilterQuery.toLowerCase();
    return (
      e.content.toLowerCase().includes(q) ||
      e.projectName?.toLowerCase().includes(q) ||
      e.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const filteredProjects = projects.filter((p) => {
    if (!projectsFilterQuery) return true;
    const q = projectsFilterQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.content.toLowerCase().includes(q);
  });

  const entrySelection = useSelectionById(filteredEntries);
  const projectSelection = useSelectionById(filteredProjects);
  const selectedEntry = entrySelection.selected;
  const selectedProject = projectSelection.selected;

  const { rememberDeleted, undo: undoDelete } = useUndoDelete({
    restoreEntry,
    onStatusMessage: setStatusMessage,
  });

  const modal = useModalManager({
    projects,
    tags,
    currentTab,
    selectedEntry,
    selectedProject,
    timelineFilterQuery,
    projectsFilterQuery,
    journal: journalData,
    onStatusMessage: setStatusMessage,
    onTimelineFilterChange: (q) => {
      setTimelineFilterQuery(q);
      entrySelection.clear();
    },
    onProjectsFilterChange: (q) => {
      setProjectsFilterQuery(q);
      projectSelection.clear();
    },
    onEntryDeleted: (entry) => {
      rememberDeleted(entry);
      const previous = filteredEntries[Math.max(0, entrySelection.selectedIndex - 1)];
      entrySelection.select(previous);
    },
  });

  const navigateToDate = useCallback(
    (dateStr: string) => {
      setTimelineFilterQuery(dateStr);
      setCurrentTab("TIMELINE");
      entrySelection.clear();
      setStatusMessage(`Navigated to timeline for date: ${dateStr}`);
    },
    [entrySelection.clear],
  );

  useMouseClick(({ type }) => {
    if (type !== "down") return;
    if (modal.inputMode === "HELP") modal.closeModal();
  });

  const selectTab = useCallback((tab: Tab) => {
    setCurrentTab(tab);
    setStatusMessage(`${tab.charAt(0) + tab.slice(1).toLowerCase()} View`);
  }, []);

  useSelectionClipboard(setStatusMessage);

  useAppKeymaps({
    currentTab,
    modalOpen: modal.isOpen,
    onSelectTab: selectTab,
    onOpenFilter: modal.openFilter,
    onOpenHelp: modal.openHelp,
    onRefresh: async () => {
      await reloadData();
      setStatusMessage("Refreshed data");
    },
    onClearFilter: () => {
      if (currentTab === "TIMELINE" && timelineFilterQuery) {
        setTimelineFilterQuery("");
        setStatusMessage("Timeline filter cleared");
      } else if (currentTab === "PROJECTS" && projectsFilterQuery) {
        setProjectsFilterQuery("");
        setStatusMessage("Projects filter cleared");
      }
    },
    onQuit,
  });

  return (
    <box flexDirection="column" width={width} height={height}>
      <Header
        width={width}
        currentTab={currentTab}
        onSelectTab={selectTab}
        journalIcon={icons.journal}
        theme={theme}
      />

      <box flexGrow={1} flexDirection="column">
        {isError ? (
          <ErrorState error={error} theme={theme} />
        ) : currentTab === "DASHBOARD" ? (
          <DashboardView
            dashboard={dashboard}
            projects={projects}
            loading={loading}
            focusedDayIdx={focusedDayIdx}
            onFocusDayIdx={setFocusedDayIdx}
            onNavigateDate={navigateToDate}
            onQuickCapture={journalData.quickCapture}
            onStatusMessage={setStatusMessage}
            icons={icons}
            theme={theme}
            quickCaptureKey={config.keymaps.quick_capture}
            isActive={!modal.isOpen}
          />
        ) : currentTab === "TIMELINE" ? (
          <TimelineView
            entries={filteredEntries}
            selectedEntryIdx={Math.max(0, entrySelection.selectedIndex)}
            onSelectEntry={entrySelection.selectIndex}
            filterQuery={timelineFilterQuery}
            quickCaptureKey={config.keymaps.quick_capture}
            loading={loading}
            icons={icons}
            theme={theme}
            isActive={!modal.isOpen}
            onStatusMessage={setStatusMessage}
            onQuickCapture={modal.openCapture}
            onEditContent={modal.openEditContent}
            onEditProject={modal.openEditProject}
            onEditTags={modal.openEditTags}
            onDeleteEntry={modal.openDeleteConfirm}
            onUndoDelete={undoDelete}
            onUpdateEntryContent={async (id, content) => {
              await updateEntryContent(id, content);
              setStatusMessage("Updated note content via editor!");
            }}
          />
        ) : currentTab === "REFLECTIONS" ? (
          <ReflectionsView
            periodType={reflectionPeriodType}
            onChangePeriodType={(pt) => {
              setReflectionPeriodType(pt);
              setSelectedPeriodIdx(0);
            }}
            selectedPeriodIdx={selectedPeriodIdx}
            onSelectPeriodIdx={setSelectedPeriodIdx}
            width={width}
            icons={icons}
            theme={theme}
            isActive={!modal.isOpen}
            onStatusMessage={setStatusMessage}
          />
        ) : (
          <ProjectsView
            projects={filteredProjects}
            selectedProjectIdx={Math.max(0, projectSelection.selectedIndex)}
            onSelectProject={projectSelection.selectIndex}
            entries={entries}
            filterQuery={projectsFilterQuery}
            width={width}
            icons={icons}
            theme={theme}
            isActive={!modal.isOpen}
            onStatusMessage={setStatusMessage}
            onNewProject={modal.openNewProject}
            onEditProjectSettings={modal.openEditProjectSettings}
            onUpdateProjectContent={async (id, content) => {
              await updateProjectContent(id, content);
              const targetProj = filteredProjects.find((p) => p.id === id);
              setStatusMessage(`Updated content for @${targetProj?.name || "project"}`);
            }}
          />
        )}
      </box>

      <ActiveModal
        modal={modal}
        width={width}
        height={height}
        theme={theme}
        icons={icons}
        selectedEntry={selectedEntry}
        selectedProject={selectedProject}
        currentTab={currentTab}
        keymaps={config.keymaps}
      />

      <StatusBar
        width={width}
        filterQuery={currentTab === "TIMELINE" ? timelineFilterQuery : projectsFilterQuery}
        statusMessage={statusMessage}
        icons={icons}
        theme={theme}
        currentTab={currentTab}
      />
    </box>
  );
}
