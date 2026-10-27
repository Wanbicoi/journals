import type { Tab } from "./useAppKeymaps.js";
import { useAppKeymaps } from "./useAppKeymaps.js";
import { useMouseClick } from "./useMouseClick.js";
import { useSelectionClipboard } from "./useSelectionClipboard.js";

interface UseGlobalCommandsOptions {
  currentTab: Tab;
  modalOpen: boolean;
  helpOpen: boolean;
  onSelectTab: (tab: Tab) => void;
  onOpenFilter: () => void;
  onOpenHelp: () => void;
  onCloseHelp: () => void;
  onRefresh: () => Promise<void> | void;
  onClearFilter: () => void;
  onQuit: () => void;
  onStatusMessage: (message: string) => void;
}

/**
 * Input commands that belong to the whole app: global keys, the help-click dismissal, and copying
 * a terminal selection. Views keep their own keys.
 */

// @unit journals.hooks.global-commands
// @summary Wire the global input surface
export function useGlobalCommands({
  currentTab,
  modalOpen,
  helpOpen,
  onSelectTab,
  onOpenFilter,
  onOpenHelp,
  onCloseHelp,
  onRefresh,
  onClearFilter,
  onQuit,
  onStatusMessage,
}: UseGlobalCommandsOptions) {
  useMouseClick(({ type }) => {
    if (type === "down" && helpOpen) onCloseHelp();
  });

  useSelectionClipboard(onStatusMessage);

  useAppKeymaps({
    currentTab,
    modalOpen,
    onSelectTab,
    onOpenFilter,
    onOpenHelp,
    onRefresh,
    onClearFilter,
    onQuit,
  });
}
