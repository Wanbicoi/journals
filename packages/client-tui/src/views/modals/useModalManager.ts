import { normalizeRecurrenceRule } from "@journals/core";
import { useKeyboard } from "@opentui/react";
import { useCallback, useState } from "react";
import { openExternalEditor } from "../../editor.js";
import type { Entry, Project, TagInfo } from "../../hooks/useJournalData.js";
import { useSuggestions } from "../../hooks/useSuggestions.js";
import { matchesAnyBinding, matchesBinding } from "../../keymap.js";

export type ModalMode =
  | "NONE"
  | "CAPTURE"
  | "NEW_PROJECT"
  | "EDIT_PROJECT"
  | "EDIT_TAGS"
  | "EDIT_CONTENT"
  | "DELETE_CONFIRM"
  | "FILTER"
  | "HELP"
  | "EDIT_PROJECT_SETTINGS";

export interface UseModalManagerOptions {
  projects: Project[];
  tags: TagInfo[];
  currentTab: "DASHBOARD" | "TIMELINE" | "REFLECTIONS" | "PROJECTS";
  selectedEntry?: Entry;
  selectedProject?: Project;
  timelineFilterQuery?: string;
  projectsFilterQuery?: string;
  onStatusMessage?: (msg: string) => void;
  onTimelineFilterChange?: (query: string) => void;
  onProjectsFilterChange?: (query: string) => void;
  onEntryDeleted?: (entry: Entry) => void;
  quickCapture?: (raw: string) => Promise<unknown>;
  createProject?: (
    name: string,
    recurrence?: string | null,
    missedPolicy?: "accumulate" | "spike" | "mark_done",
  ) => Promise<unknown>;
  updateProject?: (
    id: string,
    data: {
      name?: string;
      recurrence?: string | null;
      missedPolicy?: "accumulate" | "spike" | "mark_done";
    },
  ) => Promise<unknown>;
  updateEntryProject?: (id: string, projectName: string) => Promise<unknown>;
  updateEntryTags?: (id: string, tags: string[]) => Promise<unknown>;
  updateEntryContent?: (id: string, content: string) => Promise<unknown>;
  deleteEntry?: (id: string) => Promise<unknown>;
}

export interface ModalManager {
  inputMode: ModalMode;
  isOpen: boolean;
  inputBuffer: string;
  setInputBuffer: (buffer: string | ((prev: string) => string)) => void;
  openModal: (mode: ModalMode, initialBuffer?: string, statusMsg?: string) => void;
  closeModal: (statusMsg?: string) => void;
  commitModalInput: (overrideBuffer?: string) => Promise<void>;
  suggestions: ReturnType<ReturnType<typeof useSuggestions>["getSuggestions"]>;
  activeSuggestionIdx: number;
  openCapture: () => void;
  openEditContent: (entry: Entry) => void;
  openEditProject: (entry: Entry) => void;
  openEditTags: (entry: Entry) => void;
  openDeleteConfirm: () => void;
  openNewProject: () => void;
  openEditProjectSettings: (project: Project) => void;
  openFilter: () => void;
  openHelp: () => void;
}

export function useModalManager(options: UseModalManagerOptions): ModalManager {
  const {
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
    quickCapture,
    createProject,
    updateProject,
    updateEntryProject,
    updateEntryTags,
    updateEntryContent,
    deleteEntry,
  } = options;

  const [inputMode, setInputMode] = useState<ModalMode>("NONE");
  const [inputBuffer, setInputBuffer] = useState("");

  const { activeSuggestionIdx, setActiveSuggestionIdx, getSuggestions, applySuggestion } =
    useSuggestions(projects, tags);

  const suggestions =
    inputMode === "CAPTURE"
      ? getSuggestions(inputBuffer, ["project", "tag", "break"])
      : inputMode === "EDIT_PROJECT"
        ? getSuggestions(inputBuffer, ["project"])
        : inputMode === "EDIT_TAGS"
          ? getSuggestions(inputBuffer, ["tag"])
          : null;

  const openModal = useCallback(
    (mode: ModalMode, initialBuffer = "", statusMsg?: string) => {
      setInputMode(mode);
      setInputBuffer(initialBuffer);
      if (statusMsg) {
        onStatusMessage?.(statusMsg);
      }
    },
    [onStatusMessage],
  );

  const closeModal = useCallback(
    (statusMsg?: string) => {
      setInputMode("NONE");
      setInputBuffer("");
      if (statusMsg) {
        onStatusMessage?.(statusMsg);
      }
    },
    [onStatusMessage],
  );

  const openCapture = useCallback(() => {
    openModal("CAPTURE", "", "Quick Capture: @project #tags note content");
  }, [openModal]);

  const openEditContent = useCallback(
    (entry: Entry) => {
      openModal("EDIT_CONTENT", entry.content, "Edit note content");
    },
    [openModal],
  );

  const openEditProject = useCallback(
    (entry: Entry) => {
      openModal("EDIT_PROJECT", `@${entry.projectName || ""}`, "Reassign note project (@name)");
    },
    [openModal],
  );

  const openEditTags = useCallback(
    (entry: Entry) => {
      openModal("EDIT_TAGS", entry.tags.join(", "), "Edit note tags (comma-separated)");
    },
    [openModal],
  );

  const openDeleteConfirm = useCallback(() => {
    openModal("DELETE_CONFIRM", "", "Confirm delete (y/n)");
  }, [openModal]);

  const openNewProject = useCallback(() => {
    openModal("NEW_PROJECT", "", "Enter new project name");
  }, [openModal]);

  const openEditProjectSettings = useCallback(
    (proj: Project) => {
      const recurStr = proj.recurrence ? ` /recur ${proj.recurrence}` : "";
      const policyStr = ` /policy:${proj.missedPolicy || "spike"}`;
      openModal(
        "EDIT_PROJECT_SETTINGS",
        `${proj.name}${recurStr}${policyStr}`,
        `Edit routine & settings for @${proj.name}`,
      );
    },
    [openModal],
  );

  const openFilter = useCallback(() => {
    const q = currentTab === "TIMELINE" ? (timelineFilterQuery ?? "") : (projectsFilterQuery ?? "");
    openModal(
      "FILTER",
      q,
      currentTab === "TIMELINE"
        ? "Filter timeline entries (type text, @project, #tag)"
        : "Filter projects (type project name or content)",
    );
  }, [currentTab, timelineFilterQuery, projectsFilterQuery, openModal]);

  const openHelp = useCallback(() => {
    openModal("HELP");
  }, [openModal]);

  const commitModalInput = useCallback(
    async (overrideBuffer?: string) => {
      if (inputMode === "NONE") return;
      const currentMode = inputMode;
      const buffer = (overrideBuffer !== undefined ? overrideBuffer : inputBuffer).trim();
      setInputMode("NONE");
      setInputBuffer("");

      if (currentMode === "CAPTURE") {
        if (buffer && quickCapture) {
          await quickCapture(buffer);
          onStatusMessage?.("Captured new journal entry!");
        }
      } else if (currentMode === "NEW_PROJECT") {
        const raw = buffer;
        if (raw && createProject) {
          const tokens = raw.split(/\s+/);
          let name = tokens[0];
          let recurrence: string | null = null;
          let missedPolicy: "accumulate" | "spike" | "mark_done" = "spike";

          const recurIdx = tokens.findIndex(
            (t) => t.startsWith("/every") || t.startsWith("/recur"),
          );
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
          onStatusMessage?.(`Created project @${name}`);
        }
      } else if (currentMode === "FILTER") {
        const q = buffer;
        if (currentTab === "TIMELINE") {
          onTimelineFilterChange?.(q);
          onStatusMessage?.(q ? `Timeline Filter: "${q}"` : "Timeline filter cleared");
        } else {
          onProjectsFilterChange?.(q);
          onStatusMessage?.(q ? `Projects Filter: "${q}"` : "Projects filter cleared");
        }
      } else if (currentMode === "EDIT_PROJECT") {
        const targetProj = buffer.replace(/^@/, "");
        if (selectedEntry && targetProj && updateEntryProject) {
          await updateEntryProject(selectedEntry.id, targetProj);
          onStatusMessage?.(`Note reassigned to @${targetProj}`);
        }
      } else if (currentMode === "EDIT_TAGS") {
        if (selectedEntry && updateEntryTags) {
          const newTags = buffer
            .split(",")
            .map((t) => t.trim().toLowerCase().replace(/^#/, ""))
            .filter((t) => /^[a-z0-9-_]+$/.test(t));
          await updateEntryTags(selectedEntry.id, newTags);
          onStatusMessage?.("Updated note tags!");
        }
      } else if (currentMode === "EDIT_CONTENT") {
        if (selectedEntry && buffer && updateEntryContent) {
          await updateEntryContent(selectedEntry.id, buffer);
          onStatusMessage?.("Updated note content!");
        }
      } else if (currentMode === "EDIT_PROJECT_SETTINGS") {
        const targetProj = selectedProject;
        const raw = buffer;
        if (targetProj && raw && updateProject) {
          const tokens = raw.split(/\s+/);
          let name = tokens[0];
          let recurrence: string | null | undefined = undefined;
          let missedPolicy: "accumulate" | "spike" | "mark_done" | undefined = undefined;

          const recurIdx = tokens.findIndex(
            (t) => t.startsWith("/every") || t.startsWith("/recur"),
          );
          if (recurIdx !== -1) {
            name = tokens.slice(0, recurIdx).join(" ");
            const recurPart = tokens
              .slice(recurIdx)
              .filter((t) => !t.startsWith("/policy"))
              .join(" ")
              .replace(/^\/(every|recur:?)\s*/, "");
            if (recurPart.toLowerCase() === "none" || recurPart.toLowerCase() === "clear") {
              recurrence = null;
            } else {
              recurrence = normalizeRecurrenceRule(recurPart);
            }
          }

          const policyToken = tokens.find((t) => t.startsWith("/policy:"));
          if (policyToken) {
            const val = policyToken.replace("/policy:", "").toLowerCase();
            if (val === "accumulate" || val === "spike" || val === "mark_done") {
              missedPolicy = val;
            }
          }

          await updateProject(targetProj.id, {
            name: name.replace(/^@/, "") || targetProj.name,
            recurrence,
            missedPolicy,
          });
          onStatusMessage?.(`Updated settings for @${name.replace(/^@/, "") || targetProj.name}`);
        }
      }
    },
    [
      inputMode,
      inputBuffer,
      quickCapture,
      onStatusMessage,
      createProject,
      currentTab,
      onTimelineFilterChange,
      onProjectsFilterChange,
      selectedEntry,
      updateEntryProject,
      updateEntryTags,
      updateEntryContent,
      selectedProject,
      updateProject,
    ],
  );

  useKeyboard(async (key) => {
    if (inputMode === "NONE") return;

    if (inputMode === "HELP") {
      closeModal();
      return;
    }

    if (inputMode === "DELETE_CONFIRM") {
      if (matchesBinding(key, "y")) {
        if (selectedEntry && deleteEntry) {
          onEntryDeleted?.(selectedEntry);
          await deleteEntry(selectedEntry.id);
          onStatusMessage?.("Deleted entry. Press 'u' to undo.");
        }
        closeModal();
      } else if (matchesAnyBinding(key, "n", "escape")) {
        closeModal("Delete cancelled");
      }
      return;
    }

    // Modal Input Handling (Note: EDIT_CONTENT uses native <textarea> handlers)
    if (inputMode === "EDIT_CONTENT") {
      return;
    }

    if (matchesBinding(key, "return")) {
      await commitModalInput();
      return;
    }

    if (matchesBinding(key, "escape")) {
      if (inputMode === "FILTER") {
        if (currentTab === "TIMELINE") {
          onTimelineFilterChange?.("");
        } else {
          onProjectsFilterChange?.("");
        }
      }
      closeModal("Cancelled");
      return;
    }

    if (suggestions && suggestions.matches.length > 1) {
      if (matchesBinding(key, "down")) {
        setActiveSuggestionIdx((prev) => (prev + 1) % suggestions.matches.length);
        return;
      }
      if (matchesBinding(key, "up")) {
        setActiveSuggestionIdx(
          (prev) => (prev - 1 + suggestions.matches.length) % suggestions.matches.length,
        );
        return;
      }
    }

    if (inputMode === "CAPTURE" && key.ctrl && matchesBinding(key, "e")) {
      const edited = openExternalEditor(inputBuffer);
      setInputBuffer(edited);
      onStatusMessage?.("Drafted capture in external editor");
      return;
    }

    if (matchesBinding(key, "tab")) {
      setInputBuffer((prev) => applySuggestion(prev, suggestions));
    }
  });

  return {
    inputMode,
    isOpen: inputMode !== "NONE",
    inputBuffer,
    setInputBuffer,
    openModal,
    closeModal,
    commitModalInput,
    suggestions,
    activeSuggestionIdx,
    openCapture,
    openEditContent,
    openEditProject,
    openEditTags,
    openDeleteConfirm,
    openNewProject,
    openEditProjectSettings,
    openFilter,
    openHelp,
  };
}
