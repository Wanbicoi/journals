import { useCallback } from "react";
import type { Tab } from "./useAppKeymaps.js";
import { useGlobalCommands } from "./useGlobalCommands.js";
import type { useJournalFilters } from "./useJournalFilters.js";
import type { ModalManager } from "./useModalManager.js";

interface UseAppCommandsOptions {
  currentTab: Tab;
  setCurrentTab: (tab: Tab) => void;
  modal: ModalManager;
  filters: ReturnType<typeof useJournalFilters>;
  onQuit: () => void;
  reloadData: () => Promise<void>;
  onStatusMessage: (message: string) => void;
}

/**
 * Wires the global input surface to the screen's state, reports the outcome of each command, and
 * owns the tab label transition. Returns the tab selector the header uses.
 */

// @unit journals.hooks.commands
// @summary Bind global keymaps and commands
export function useAppCommands({
  currentTab,
  setCurrentTab,
  modal,
  filters,
  onQuit,
  reloadData,
  onStatusMessage,
}: UseAppCommandsOptions) {
  const selectTab = useCallback(
    (tab: Tab) => {
      setCurrentTab(tab);
      onStatusMessage(`${tab.charAt(0) + tab.slice(1).toLowerCase()} View`);
    },
    [onStatusMessage, setCurrentTab],
  );

  // @call journals.hooks.global-commands Wire the global input surface
  useGlobalCommands({
    currentTab,
    modalOpen: modal.isOpen,
    helpOpen: modal.inputMode === "HELP",
    onSelectTab: selectTab,
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

  return selectTab;
}
