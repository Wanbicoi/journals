import type { ReflectionPeriodType } from "@journals/core";
import {
  useKeyboard,
  useRenderer,
  useSelectionHandler,
  useTerminalDimensions,
} from "@opentui/react";
import { useCallback, useState } from "react";
import { config } from "../api/client.js";
import { copyToClipboard } from "../clipboard.js";
import { ErrorState } from "../components/ErrorState.js";
import { Header } from "../components/Header.js";
import { StatusBar } from "../components/StatusBar.js";
import type { Entry } from "../hooks/useJournalData.js";
import { useJournalData } from "../hooks/useJournalData.js";
import { useMouseClick } from "../hooks/useMouseClick.js";
import { useSelectionById } from "../hooks/useSelection.js";
import { getTheme } from "../theme.js";
import { DashboardView } from "./dashboard/DashboardView.js";
import { ActiveModal } from "./modals/ActiveModal.js";
import { useModalManager } from "./modals/useModalManager.js";
import { ProjectsView } from "./projects/ProjectsView.js";
import { ReflectionsView } from "./reflections/ReflectionsView.js";
import { TimelineView } from "./timeline/TimelineView.js";

type Tab = "DASHBOARD" | "TIMELINE" | "REFLECTIONS" | "PROJECTS";
const TABS: Tab[] = ["DASHBOARD", "TIMELINE", "REFLECTIONS", "PROJECTS"];

const TAB_KEY_MAP: Record<string, Tab> = {
  "1": "DASHBOARD",
  [config.keymaps.view_dashboard]: "DASHBOARD",
  "2": "TIMELINE",
  [config.keymaps.view_timeline]: "TIMELINE",
  "3": "REFLECTIONS",
  [config.keymaps.view_reflections]: "REFLECTIONS",
  "4": "PROJECTS",
  [config.keymaps.view_projects]: "PROJECTS",
};

export function App() {
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
  const [lastDeletedEntry, setLastDeletedEntry] = useState<Entry | null>(null);
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
      setLastDeletedEntry(entry);
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

  const renderer = useRenderer();
  useSelectionHandler((selection) => {
    const text = selection?.getSelectedText();
    if (text) {
      copyToClipboard(text, renderer);
      const preview = text.trim().replace(/\s+/g, " ");
      const display = preview.length > 30 ? `${preview.slice(0, 30)}...` : preview;
      setStatusMessage(`Copied to clipboard: "${display}"`);
    }
  });

  useKeyboard(async (key) => {
    const k = key.sequence || key.name;
    if (key.ctrl && key.name === "c") process.exit(0);
    if (modal.isOpen) return;

    if (
      key.name === config.keymaps.quit ||
      k === config.keymaps.quit ||
      key.name === "q" ||
      k === "q"
    ) {
      process.exit(0);
    }

    const tab = TAB_KEY_MAP[key.name] || (k ? TAB_KEY_MAP[k] : undefined);
    if (tab) {
      setCurrentTab(tab);
      setStatusMessage(`${tab.charAt(0) + tab.slice(1).toLowerCase()} View`);
      return;
    }

    if (key.name === "tab") {
      setCurrentTab((prev) => TABS[(TABS.indexOf(prev) + 1) % TABS.length]);
    } else if (key.name === config.keymaps.search_filter || k === config.keymaps.search_filter) {
      modal.openFilter();
    } else if (key.name === config.keymaps.help || k === config.keymaps.help) {
      modal.openHelp();
    } else if (key.name === config.keymaps.refresh || k === config.keymaps.refresh) {
      await reloadData();
      setStatusMessage("Refreshed data");
    } else if (key.name === config.keymaps.cancel || k === config.keymaps.cancel) {
      if (currentTab === "TIMELINE" && timelineFilterQuery) {
        setTimelineFilterQuery("");
        setStatusMessage("Timeline filter cleared");
      } else if (currentTab === "PROJECTS" && projectsFilterQuery) {
        setProjectsFilterQuery("");
        setStatusMessage("Projects filter cleared");
      }
    }
  });

  return (
    <box flexDirection="column" width={width} height={height}>
      <Header
        width={width}
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setStatusMessage(`${tab.charAt(0) + tab.slice(1).toLowerCase()} View`);
        }}
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
            onUndoDelete={async () => {
              if (lastDeletedEntry) {
                await restoreEntry(lastDeletedEntry.id);
                setStatusMessage(`Restored entry "${lastDeletedEntry.content.slice(0, 30)}..."`);
                setLastDeletedEntry(null);
              } else {
                setStatusMessage("No recently deleted entry to undo");
              }
            }}
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
