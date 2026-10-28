import { useModals } from "../contexts/modals.js";
import type { Tab } from "../contexts/navigation.js";
import { useNavigation } from "../contexts/navigation.js";
import { useNotifications } from "../contexts/notification.js";
import { useRefreshData } from "../hooks/useRefreshData.js";
import { useAppKeymaps } from "./useAppKeymaps.js";
import { useSelectionClipboard } from "./useSelectionClipboard.js";

/**
 * The screen-level input surface. Keymaps stay a pure dispatcher; this hook turns the global keys
 * into route, modal, and refresh actions read from their contexts.
 */

// @unit journals.hooks.commands
// @summary Bind global keymaps and commands
export function useAppCommands(onQuit: () => void) {
  const { tab, navigate, clearFilter } = useNavigation();
  const { open } = useModals();
  const { notify } = useNotifications();
  const refresh = useRefreshData();

  // @call journals.hooks.clipboard Copy the terminal selection
  useSelectionClipboard();

  // @call journals.hooks.app-keymaps Dispatch the screen-level keys
  useAppKeymaps({
    currentTab: tab,
    onSelectTab: (nextTab: Tab) => navigate(nextTab),
    onOpenFilter: () => open({ name: "filter" }),
    onOpenHelp: () => open({ name: "help" }),
    onRefresh: async () => {
      await refresh();
      notify("Refreshed data");
    },
    onClearFilter: () => {
      if (clearFilter()) notify("Filter cleared");
    },
    onQuit,
  });
}
