import type { Config, IconSet } from "@journals/core";
import { config } from "../../api/client.js";
import type { Entry, Project } from "../../hooks/useJournalData.js";
import type { ThemePalette } from "../../theme.js";
import { DeleteConfirmModal } from "./DeleteConfirmModal.js";
import { EditContentModal } from "./EditContentModal.js";
import { EditProjectModal } from "./EditProjectModal.js";
import { EditProjectSettingsModal } from "./EditProjectSettingsModal.js";
import { EditTagsModal } from "./EditTagsModal.js";
import { FilterModal } from "./FilterModal.js";
import { HelpModal } from "./HelpModal.js";
import { NewProjectModal } from "./NewProjectModal.js";
import { QuickCaptureModal } from "./QuickCaptureModal.js";
import type { ModalManager } from "./useModalManager.js";

export interface ActiveModalProps {
  modal: ModalManager;
  width: number;
  height: number;
  theme: ThemePalette;
  icons: IconSet;
  selectedEntry?: Entry;
  selectedProject?: Project;
  currentTab: "DASHBOARD" | "TIMELINE" | "REFLECTIONS" | "PROJECTS";
  keymaps?: Config["keymaps"];
}

export function ActiveModal({
  modal,
  width,
  height,
  theme,
  icons,
  selectedEntry,
  selectedProject,
  currentTab,
  keymaps = config.keymaps,
}: ActiveModalProps) {
  const {
    inputMode,
    inputBuffer,
    setInputBuffer,
    commitModalInput,
    closeModal,
    suggestions,
    activeSuggestionIdx,
  } = modal;

  if (inputMode === "NONE") {
    return null;
  }

  switch (inputMode) {
    case "CAPTURE":
      return (
        <QuickCaptureModal
          width={width}
          height={height}
          inputBuffer={inputBuffer}
          suggestions={suggestions}
          activeSuggestionIdx={activeSuggestionIdx}
          quickIcon={icons.quick}
          theme={theme}
          onChange={setInputBuffer}
          onSubmit={commitModalInput}
        />
      );

    case "EDIT_CONTENT":
      if (!selectedEntry) return null;
      return (
        <EditContentModal
          width={width}
          height={height}
          initialValue={selectedEntry.content}
          theme={theme}
          onSave={async (newContent) => {
            await commitModalInput(newContent);
          }}
          onCancel={() => {
            closeModal("Edit cancelled");
          }}
        />
      );

    case "DELETE_CONFIRM":
      if (!selectedEntry) return null;
      return (
        <DeleteConfirmModal
          width={width}
          height={height}
          entrySummary={selectedEntry.content}
          warningIcon={icons.warning}
          theme={theme}
        />
      );

    case "EDIT_PROJECT":
      return (
        <EditProjectModal
          width={width}
          height={height}
          inputBuffer={inputBuffer}
          suggestions={suggestions}
          activeSuggestionIdx={activeSuggestionIdx}
          projectIcon={icons.project}
          theme={theme}
          onChange={setInputBuffer}
          onSubmit={commitModalInput}
        />
      );

    case "EDIT_TAGS":
      return (
        <EditTagsModal
          width={width}
          height={height}
          inputBuffer={inputBuffer}
          suggestions={suggestions}
          activeSuggestionIdx={activeSuggestionIdx}
          tagIcon={icons.tag}
          theme={theme}
          onChange={setInputBuffer}
          onSubmit={commitModalInput}
        />
      );

    case "NEW_PROJECT":
      return (
        <NewProjectModal
          width={width}
          height={height}
          inputBuffer={inputBuffer}
          projectIcon={icons.project}
          theme={theme}
          onChange={setInputBuffer}
          onSubmit={commitModalInput}
        />
      );

    case "EDIT_PROJECT_SETTINGS":
      if (!selectedProject) return null;
      return (
        <EditProjectSettingsModal
          width={width}
          height={height}
          projectName={selectedProject.name}
          inputBuffer={inputBuffer}
          projectIcon={icons.project}
          theme={theme}
          onChange={setInputBuffer}
          onSubmit={commitModalInput}
        />
      );

    case "FILTER":
      return (
        <FilterModal
          width={width}
          height={height}
          inputBuffer={inputBuffer}
          tabTitle={currentTab === "TIMELINE" ? "Timeline / Journal" : "Projects"}
          theme={theme}
          onChange={setInputBuffer}
          onSubmit={commitModalInput}
        />
      );

    case "HELP":
      return <HelpModal width={width} height={height} keymaps={keymaps} theme={theme} />;

    default:
      return null;
  }
}
