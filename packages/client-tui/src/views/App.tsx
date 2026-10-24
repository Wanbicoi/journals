import type { ReflectionPeriodType } from "@journals/core";
import { normalizeRecurrenceRule } from "@journals/core";
import {
  useKeyboard,
  useRenderer,
  useSelectionHandler,
  useTerminalDimensions,
} from "@opentui/react";
import { useCallback, useState } from "react";
import { config, fetchPeriodDetailApi, fetchPeriodsApi, saveReflectionApi } from "../api/client.js";
import { copyToClipboard } from "../clipboard.js";
import { Header } from "../components/Header.js";
import { StatusBar } from "../components/StatusBar.js";
import { openExternalEditor } from "../editor.js";
import { useJournalData } from "../hooks/useJournalData.js";
import { useMouseClick } from "../hooks/useMouseClick.js";
import { useSuggestions } from "../hooks/useSuggestions.js";
import { getTheme } from "../theme.js";
import { DashboardView } from "./dashboard/DashboardView.js";
import { DeleteConfirmModal } from "./modals/DeleteConfirmModal.js";
import { EditContentModal } from "./modals/EditContentModal.js";
import { EditProjectModal } from "./modals/EditProjectModal.js";
import { EditTagsModal } from "./modals/EditTagsModal.js";
import { FilterModal } from "./modals/FilterModal.js";
import { HelpModal } from "./modals/HelpModal.js";
import { NewProjectModal } from "./modals/NewProjectModal.js";
import { QuickCaptureModal } from "./modals/QuickCaptureModal.js";
import { ProjectsView } from "./projects/ProjectsView.js";
import { ReflectionsView } from "./reflections/ReflectionsView.js";
import { TimelineView } from "./timeline/TimelineView.js";

export function App() {
  const { width = 100, height = 30 } = useTerminalDimensions();
  const icons = config.appearance.use_nerd_font ? config.icons.nerd : config.icons.plain;
  const theme = getTheme(config.appearance.theme);

  const {
    entries,
    projects,
    tags,
    dashboard,
    loading,
    reloadData,
    quickCapture,
    createProject,
    updateProjectContent,
    updateEntryProject,
    updateEntryTags,
    updateEntryContent,
    deleteEntry,
  } = useJournalData();

  const [currentTab, setCurrentTab] = useState<
    "DASHBOARD" | "TIMELINE" | "REFLECTIONS" | "PROJECTS"
  >("DASHBOARD");
  const [reflectionPeriodType, setReflectionPeriodType] = useState<ReflectionPeriodType>("WEEK");
  const [selectedPeriodIdx, setSelectedPeriodIdx] = useState(0);
  const [reflectionsRefreshSignal, setReflectionsRefreshSignal] = useState(0);
  const [inputMode, setInputMode] = useState<
    | "NONE"
    | "CAPTURE"
    | "NEW_PROJECT"
    | "EDIT_PROJECT"
    | "EDIT_TAGS"
    | "EDIT_CONTENT"
    | "DELETE_CONFIRM"
    | "FILTER"
    | "HELP"
  >("NONE");
  const [timelineFilterQuery, setTimelineFilterQuery] = useState("");
  const [projectsFilterQuery, setProjectsFilterQuery] = useState("");
  const [inputBuffer, setInputBuffer] = useState("");

  const [selectedEntryIdx, setSelectedEntryIdx] = useState(0);
  const [selectedProjectIdx, setSelectedProjectIdx] = useState(0);
  const [focusedDayIdx, setFocusedDayIdx] = useState(59); // Focus latest day on 60-day chart
  const [statusMessage, setStatusMessage] = useState("Ready");

  const { activeSuggestionIdx, setActiveSuggestionIdx, getSuggestions, applySuggestion } =
    useSuggestions(projects, tags);

  // Filter entries (Timeline Tab filter)
  const filteredEntries = entries.filter((e) => {
    if (!timelineFilterQuery) return true;
    const q = timelineFilterQuery.toLowerCase();
    return (
      e.content.toLowerCase().includes(q) ||
      e.projectName?.toLowerCase().includes(q) ||
      e.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  // Filter projects (Projects Tab filter)
  const filteredProjects = projects.filter((p) => {
    if (!projectsFilterQuery) return true;
    const q = projectsFilterQuery.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.content.toLowerCase().includes(q);
  });

  // Active suggestions for current input buffer
  const suggestions =
    inputMode === "CAPTURE"
      ? getSuggestions(inputBuffer, ["project", "tag", "break"])
      : inputMode === "EDIT_PROJECT"
        ? getSuggestions(inputBuffer, ["project"])
        : inputMode === "EDIT_TAGS"
          ? getSuggestions(inputBuffer, ["tag"])
          : null;

  const navigateToDate = useCallback((dateStr: string) => {
    setTimelineFilterQuery(dateStr);
    setCurrentTab("TIMELINE");
    setSelectedEntryIdx(0);
    setStatusMessage(`Navigated to timeline for date: ${dateStr}`);
  }, []);

  // Handle Mouse Click anywhere in terminal
  const handleMouse = useCallback(
    ({ x, y, type }: { x: number; y: number; button: number; type: string }) => {
      if (type !== "down") return;

      // If clicked on chart area in Dashboard: navigate directly to that date!
      if (currentTab === "DASHBOARD" && dashboard && y >= 3 && y <= 21) {
        // Bottom inspector box (around row 19-21)
        if (y >= 19 && y <= 21) {
          const day = dashboard.days[focusedDayIdx];
          if (day) {
            navigateToDate(day.date);
            return;
          }
        }

        // Bar chart X-axis starts around x=7/8 with 60 columns
        const chartCol = Math.max(0, Math.min(dashboard.days.length - 1, x - 8));
        if (x >= 7 && x <= 8 + dashboard.days.length) {
          const day = dashboard.days[chartCol];
          if (day) {
            setFocusedDayIdx(chartCol);
            navigateToDate(day.date);
            return;
          }
        }
      }

      if (inputMode === "HELP") {
        setInputMode("NONE");
      }
    },
    [inputMode, currentTab, dashboard, focusedDayIdx, navigateToDate],
  );

  useMouseClick(handleMouse);

  const renderer = useRenderer();
  useSelectionHandler((selection) => {
    if (!selection) return;
    const text = selection.getSelectedText();
    if (text) {
      copyToClipboard(text, renderer);
      const preview = text.trim().replace(/\s+/g, " ");
      const display = preview.length > 30 ? `${preview.slice(0, 30)}...` : preview;
      setStatusMessage(`Copied to clipboard: "${display}"`);
    }
  });

  useKeyboard(async (key) => {
    const keyName = key.name;
    const str = key.sequence || key.name;

    if (key.ctrl && keyName === "c") {
      process.exit(0);
    }

    if (inputMode === "HELP") {
      setInputMode("NONE");
      return;
    }

    if (inputMode === "DELETE_CONFIRM") {
      if (keyName === "y" || str === "y") {
        const entry = filteredEntries[selectedEntryIdx];
        if (entry) {
          await deleteEntry(entry.id);
          setSelectedEntryIdx((prev) => Math.max(0, prev - 1));
          setStatusMessage("Deleted entry!");
        }
        setInputMode("NONE");
      } else if (keyName === "n" || str === "n" || keyName === "escape") {
        setInputMode("NONE");
        setStatusMessage("Delete cancelled");
      }
      return;
    }

    // Modal Input Handling (Note: EDIT_CONTENT uses native <textarea> handlers)
    if (inputMode !== "NONE") {
      if (inputMode === "EDIT_CONTENT") {
        return;
      }
      if (key.ctrl && keyName === "w") {
        setInputBuffer((prev) => prev.replace(/(?:[^\s]+|\s+)\s*$/, ""));
        return;
      }
      if (key.ctrl && keyName === "u") {
        setInputBuffer("");
        return;
      }
      if (keyName === "return") {
        await commitModalInput();
        return;
      }
      if (keyName === "escape") {
        if (inputMode === "FILTER") {
          if (currentTab === "TIMELINE") {
            setTimelineFilterQuery("");
          } else {
            setProjectsFilterQuery("");
          }
        }
        setInputMode("NONE");
        setInputBuffer("");
        setStatusMessage("Cancelled");
        return;
      }
      if (suggestions && suggestions.matches.length > 1) {
        if (keyName === "down" || keyName === "right") {
          setActiveSuggestionIdx((prev) => (prev + 1) % suggestions.matches.length);
          return;
        }
        if (keyName === "up" || keyName === "left") {
          setActiveSuggestionIdx(
            (prev) => (prev - 1 + suggestions.matches.length) % suggestions.matches.length,
          );
          return;
        }
      }
      if (keyName === "tab") {
        setInputBuffer((prev) => applySuggestion(prev, suggestions));
        return;
      }
      if (keyName === "backspace") {
        setInputBuffer((prev) => prev.slice(0, -1));
        return;
      }
      if (str && str.length === 1 && !key.ctrl && !key.meta) {
        setInputBuffer((prev) => prev + str);
        return;
      }
      return;
    }

    // Normal Mode Navigation & Shortcuts
    if (
      keyName === "1" ||
      str === "1" ||
      keyName === config.keymaps.view_dashboard ||
      str === config.keymaps.view_dashboard
    ) {
      setCurrentTab("DASHBOARD");
      setStatusMessage("Dashboard View");
    } else if (
      keyName === "2" ||
      str === "2" ||
      keyName === config.keymaps.view_timeline ||
      str === config.keymaps.view_timeline
    ) {
      setCurrentTab("TIMELINE");
      setStatusMessage("Timeline View");
    } else if (
      keyName === "3" ||
      str === "3" ||
      keyName === config.keymaps.view_reflections ||
      str === config.keymaps.view_reflections
    ) {
      setCurrentTab("REFLECTIONS");
      setStatusMessage("Reflections View");
    } else if (
      keyName === "4" ||
      str === "4" ||
      keyName === config.keymaps.view_projects ||
      str === config.keymaps.view_projects
    ) {
      setCurrentTab("PROJECTS");
      setStatusMessage("Projects View");
    } else if (keyName === "tab") {
      setCurrentTab((prev) =>
        prev === "DASHBOARD"
          ? "TIMELINE"
          : prev === "TIMELINE"
            ? "REFLECTIONS"
            : prev === "REFLECTIONS"
              ? "PROJECTS"
              : "DASHBOARD",
      );
    } else if (currentTab === "REFLECTIONS" && (str === "w" || str === "W")) {
      setReflectionPeriodType("WEEK");
      setSelectedPeriodIdx(0);
      setStatusMessage("Weekly Reflections");
    } else if (currentTab === "REFLECTIONS" && (str === "m" || str === "M")) {
      setReflectionPeriodType("MONTH");
      setSelectedPeriodIdx(0);
      setStatusMessage("Monthly Reflections");
    } else if (currentTab === "REFLECTIONS" && (str === "q" || str === "Q")) {
      setReflectionPeriodType("QUARTER");
      setSelectedPeriodIdx(0);
      setStatusMessage("Quarterly Reflections");
    } else if (currentTab === "REFLECTIONS" && (str === "y" || str === "Y")) {
      setReflectionPeriodType("YEAR");
      setSelectedPeriodIdx(0);
      setStatusMessage("Yearly Reflections");
    } else if (keyName === "return" && currentTab === "DASHBOARD" && dashboard) {
      const day = dashboard.days[focusedDayIdx];
      if (day) {
        navigateToDate(day.date);
      }
    } else if (keyName === config.keymaps.down || str === config.keymaps.down) {
      if (currentTab === "TIMELINE") {
        setSelectedEntryIdx((prev) => Math.min(prev + 1, Math.max(0, filteredEntries.length - 1)));
      } else if (currentTab === "REFLECTIONS") {
        setSelectedPeriodIdx((prev) => prev + 1);
      } else if (currentTab === "PROJECTS") {
        setSelectedProjectIdx((prev) =>
          Math.min(prev + 1, Math.max(0, filteredProjects.length - 1)),
        );
      }
    } else if (keyName === config.keymaps.up || str === config.keymaps.up) {
      if (currentTab === "TIMELINE") {
        setSelectedEntryIdx((prev) => Math.max(0, prev - 1));
      } else if (currentTab === "REFLECTIONS") {
        setSelectedPeriodIdx((prev) => Math.max(0, prev - 1));
      } else if (currentTab === "PROJECTS") {
        setSelectedProjectIdx((prev) => Math.max(0, prev - 1));
      }
    } else if (
      keyName === "left" ||
      keyName === "h" ||
      (currentTab === "DASHBOARD" && str === "h")
    ) {
      if (currentTab === "DASHBOARD") {
        setFocusedDayIdx((prev) => Math.max(0, prev - 1));
      }
    } else if (
      keyName === "right" ||
      keyName === "l" ||
      (currentTab === "DASHBOARD" && str === "l")
    ) {
      if (currentTab === "DASHBOARD") {
        setFocusedDayIdx((prev) => Math.min(59, prev + 1));
      }
    } else if (keyName === config.keymaps.quick_capture || str === config.keymaps.quick_capture) {
      setInputMode("CAPTURE");
      setInputBuffer("");
      setStatusMessage("Quick Capture: @project #tags note content");
    } else if (keyName === config.keymaps.new_project || str === config.keymaps.new_project) {
      setInputMode("NEW_PROJECT");
      setInputBuffer("");
      setStatusMessage("Enter new project name");
    } else if (keyName === config.keymaps.edit_project || str === config.keymaps.edit_project) {
      if (currentTab === "TIMELINE" && filteredEntries[selectedEntryIdx]) {
        setInputMode("EDIT_PROJECT");
        setInputBuffer(`@${filteredEntries[selectedEntryIdx].projectName}`);
        setStatusMessage("Reassign note project (@name)");
      }
    } else if (keyName === config.keymaps.edit_tags || str === config.keymaps.edit_tags) {
      if (currentTab === "TIMELINE" && filteredEntries[selectedEntryIdx]) {
        setInputMode("EDIT_TAGS");
        setInputBuffer(filteredEntries[selectedEntryIdx].tags.join(", "));
        setStatusMessage("Edit note tags (comma-separated)");
      }
    } else if (keyName === config.keymaps.delete_entry || str === config.keymaps.delete_entry) {
      if (currentTab === "TIMELINE" && filteredEntries[selectedEntryIdx]) {
        setInputMode("DELETE_CONFIRM");
        setStatusMessage("Confirm delete (y/n)");
      }
    } else if (keyName === config.keymaps.search_filter || str === config.keymaps.search_filter) {
      setInputMode("FILTER");
      const currentQuery = currentTab === "TIMELINE" ? timelineFilterQuery : projectsFilterQuery;
      setInputBuffer(currentQuery);
      setStatusMessage(
        currentTab === "TIMELINE"
          ? "Filter timeline entries (type text, @project, #tag)"
          : "Filter projects (type project name or content)",
      );
    } else if (keyName === config.keymaps.help || str === config.keymaps.help) {
      setInputMode("HELP");
    } else if (keyName === config.keymaps.refresh || str === config.keymaps.refresh) {
      await reloadData();
      setStatusMessage("Refreshed data");
    } else if (keyName === config.keymaps.cancel || str === config.keymaps.cancel) {
      if (currentTab === "TIMELINE" && timelineFilterQuery) {
        setTimelineFilterQuery("");
        setStatusMessage("Timeline filter cleared");
      } else if (currentTab === "PROJECTS" && projectsFilterQuery) {
        setProjectsFilterQuery("");
        setStatusMessage("Projects filter cleared");
      }
    } else if (
      keyName === config.keymaps.edit_project_content ||
      str === config.keymaps.edit_project_content ||
      (currentTab === "REFLECTIONS" && keyName === "return")
    ) {
      if (currentTab === "REFLECTIONS") {
        // Open editor for the selected period reflection
        try {
          const periodList = await fetchPeriodsApi(reflectionPeriodType);
          const currentP = periodList[selectedPeriodIdx];
          if (currentP) {
            const pDetail = await fetchPeriodDetailApi(reflectionPeriodType, currentP.periodKey);
            const initialContent =
              pDetail?.reflection?.content || `# Reflection: ${currentP.label}\n\n`;
            const updated = openExternalEditor(initialContent);
            if (updated !== initialContent) {
              await saveReflectionApi(reflectionPeriodType, currentP.periodKey, updated);
              setReflectionsRefreshSignal((prev) => prev + 1);
              setStatusMessage(`Saved reflection for ${currentP.periodKey}`);
            }
          }
        } catch (_e) {
          setStatusMessage("Failed to edit reflection");
        }
      } else if (currentTab === "PROJECTS" && filteredProjects[selectedProjectIdx]) {
        const targetProj = filteredProjects[selectedProjectIdx];
        const updated = openExternalEditor(targetProj.content);
        if (updated !== targetProj.content) {
          await updateProjectContent(targetProj.id, updated);
          setStatusMessage(`Updated content for @${targetProj.name}`);
        }
      } else if (currentTab === "TIMELINE" && filteredEntries[selectedEntryIdx]) {
        // Edit entry content
        const entry = filteredEntries[selectedEntryIdx];
        setInputMode("EDIT_CONTENT");
        setInputBuffer(entry.content);
        setStatusMessage("Edit note content");
      }
    } else if (keyName === config.keymaps.quit || str === config.keymaps.quit) {
      process.exit(0);
    }
  });

  async function commitModalInput() {
    if (inputMode === "CAPTURE") {
      if (inputBuffer.trim()) {
        await quickCapture(inputBuffer.trim());
        setStatusMessage("Captured new journal entry!");
      }
    } else if (inputMode === "NEW_PROJECT") {
      const raw = inputBuffer.trim();
      if (raw) {
        // Parse name, recurrence, and policy
        const tokens = raw.split(/\s+/);
        let name = tokens[0];
        let recurrence: string | null = null;
        let missedPolicy: "accumulate" | "spike" | "mark_done" = "spike";

        const recurIdx = tokens.findIndex((t) => t.startsWith("/every") || t.startsWith("/recur"));
        if (recurIdx !== -1) {
          name = tokens.slice(0, recurIdx).join(" ");
          const recurPart = tokens
            .slice(recurIdx)
            .filter((t) => !t.startsWith("/policy"))
            .join(" ")
            .replace(/^\/(every|recur:?)\s*/, "");
          recurrence = normalizeRecurrenceRule(recurPart);
        }

        const policyToken = tokens.find((t) => t.startsWith("/policy:"));
        if (policyToken) {
          const val = policyToken.replace("/policy:", "").toLowerCase();
          if (val === "accumulate" || val === "spike" || val === "mark_done") {
            missedPolicy = val;
          }
        }

        await createProject(name, recurrence, missedPolicy);
        setStatusMessage(`Created project @${name}`);
      }
    } else if (inputMode === "FILTER") {
      const q = inputBuffer.trim();
      if (currentTab === "TIMELINE") {
        setTimelineFilterQuery(q);
        setSelectedEntryIdx(0);
        setStatusMessage(q ? `Timeline Filter: "${q}"` : "Timeline filter cleared");
      } else {
        setProjectsFilterQuery(q);
        setSelectedProjectIdx(0);
        setStatusMessage(q ? `Projects Filter: "${q}"` : "Projects filter cleared");
      }
    } else if (inputMode === "EDIT_PROJECT") {
      const entry = filteredEntries[selectedEntryIdx];
      const targetProj = inputBuffer.trim().replace(/^@/, "");
      if (entry && targetProj) {
        await updateEntryProject(entry.id, targetProj);
        setStatusMessage(`Note reassigned to @${targetProj}`);
      }
    } else if (inputMode === "EDIT_TAGS") {
      const entry = filteredEntries[selectedEntryIdx];
      if (entry) {
        const newTags = inputBuffer
          .split(",")
          .map((t) => t.trim().toLowerCase().replace(/^#/, ""))
          .filter((t) => /^[a-z0-9-_]+$/.test(t));
        await updateEntryTags(entry.id, newTags);
        setStatusMessage("Updated note tags!");
      }
    } else if (inputMode === "EDIT_CONTENT") {
      const entry = filteredEntries[selectedEntryIdx];
      if (entry && inputBuffer.trim()) {
        await updateEntryContent(entry.id, inputBuffer.trim());
        setStatusMessage("Updated note content!");
      }
    }

    setInputMode("NONE");
    setInputBuffer("");
  }

  const selectedEntry = filteredEntries[selectedEntryIdx];

  return (
    <box flexDirection="column" width={width} height={height}>
      {/* Top Header */}
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

      {/* Main View Area */}
      <box flexGrow={1} flexDirection="column">
        {currentTab === "DASHBOARD" ? (
          <DashboardView
            dashboard={dashboard}
            projects={projects}
            loading={loading}
            focusedDayIdx={focusedDayIdx}
            onNavigateDate={navigateToDate}
            theme={theme}
            quickCaptureKey={config.keymaps.quick_capture}
          />
        ) : currentTab === "TIMELINE" ? (
          <TimelineView
            entries={filteredEntries}
            selectedEntryIdx={selectedEntryIdx}
            onSelectEntry={(idx) => {
              setSelectedEntryIdx(idx);
            }}
            filterQuery={timelineFilterQuery}
            quickCaptureKey={config.keymaps.quick_capture}
            loading={loading}
            icons={icons}
            theme={theme}
          />
        ) : currentTab === "REFLECTIONS" ? (
          <ReflectionsView
            periodType={reflectionPeriodType}
            onChangePeriodType={(pt) => {
              setReflectionPeriodType(pt);
              setSelectedPeriodIdx(0);
            }}
            selectedPeriodIdx={selectedPeriodIdx}
            onSelectPeriodIdx={(idx) => {
              setSelectedPeriodIdx(idx);
            }}
            refreshTrigger={reflectionsRefreshSignal}
            width={width}
            icons={icons}
            theme={theme}
          />
        ) : (
          <ProjectsView
            projects={filteredProjects}
            selectedProjectIdx={selectedProjectIdx}
            onSelectProject={(idx) => {
              setSelectedProjectIdx(idx);
            }}
            entries={entries}
            filterQuery={projectsFilterQuery}
            width={width}
            icons={icons}
            theme={theme}
          />
        )}
      </box>

      {/* Floating Modals */}
      {inputMode === "CAPTURE" && (
        <QuickCaptureModal
          width={width}
          height={height}
          inputBuffer={inputBuffer}
          suggestions={suggestions}
          activeSuggestionIdx={activeSuggestionIdx}
          quickIcon={icons.quick}
          theme={theme}
        />
      )}

      {inputMode === "EDIT_CONTENT" && selectedEntry && (
        <EditContentModal
          width={width}
          height={height}
          initialValue={selectedEntry.content}
          theme={theme}
          onSave={async (newContent) => {
            const trimmed = newContent.trim();
            if (trimmed && selectedEntry) {
              await updateEntryContent(selectedEntry.id, trimmed);
              setStatusMessage("Updated note content!");
            }
            setInputMode("NONE");
          }}
          onCancel={() => {
            setInputMode("NONE");
            setStatusMessage("Edit cancelled");
          }}
        />
      )}

      {inputMode === "DELETE_CONFIRM" && selectedEntry && (
        <DeleteConfirmModal
          width={width}
          height={height}
          entrySummary={selectedEntry.content}
          warningIcon={icons.warning || ""}
          theme={theme}
        />
      )}

      {inputMode === "EDIT_PROJECT" && (
        <EditProjectModal
          width={width}
          height={height}
          inputBuffer={inputBuffer}
          suggestions={suggestions}
          activeSuggestionIdx={activeSuggestionIdx}
          projectIcon={icons.project}
          theme={theme}
        />
      )}

      {inputMode === "EDIT_TAGS" && (
        <EditTagsModal
          width={width}
          height={height}
          inputBuffer={inputBuffer}
          suggestions={suggestions}
          activeSuggestionIdx={activeSuggestionIdx}
          tagIcon={icons.tag}
          theme={theme}
        />
      )}

      {inputMode === "NEW_PROJECT" && (
        <NewProjectModal
          width={width}
          height={height}
          inputBuffer={inputBuffer}
          projectIcon={icons.project}
          theme={theme}
        />
      )}

      {inputMode === "FILTER" && (
        <FilterModal
          width={width}
          height={height}
          inputBuffer={inputBuffer}
          tabTitle={currentTab === "TIMELINE" ? "Timeline / Journal" : "Projects"}
          theme={theme}
        />
      )}

      {inputMode === "HELP" && (
        <HelpModal width={width} height={height} keymaps={config.keymaps} theme={theme} />
      )}

      {/* Anchored Bottom Status Line */}
      <StatusBar
        width={width}
        filterQuery={currentTab === "TIMELINE" ? timelineFilterQuery : projectsFilterQuery}
        statusMessage={statusMessage}
        theme={theme}
      />
    </box>
  );
}
