import type { Tab } from "./useAppKeymaps.js";
import { useGlobalCommands } from "./useGlobalCommands.js";
import type { useJournalFilters } from "./useJournalFilters.js";
import type { ModalManager } from "./useModalManager.js";

interface UseAppCommandsOptions {
  currentTab: Tab;
  modal: ModalManager;
  filters: ReturnType<typeof useJournalFilters>;
  onSelectTab: (tab: Tab) => void;
  onQuit: () => void;
  reloadData: () => Promise<void>;
  onStatusMessage: (message: string) => void;
}

/**
 * Wires the global input surface to the screen's state and reports the outcome of each command.
 */
export function useAppCommands({
  currentTab,
  modal,
  filters,
  onSelectTab,
  onQuit,
  reloadData,
  onStatusMessage,
}: UseAppCommandsOptions) {
  useGlobalCommands({
    currentTab,
    modalOpen: modal.isOpen,
    helpOpen: modal.inputMode === "HELP",
    onSelectTab,
    onOpenFilter: modal.openFilter,
    onOpenHelp: modal.openHelp,
    onCloseHelp: () => modal.closeModal(),
    onRefresh: async () => {
      await reloadData();
      onStatusMessage("Refreshed data");
    },
    onClearFilter: () => {
      if (!filters.clearForTab(currentTab)) return;
      onStatusMessage(
        currentTab === "TIMELINE" ? "Timeline filter cleared" : "Projects filter cleared",
      );
    },
    onQuit,
    onStatusMessage,
  });
}
