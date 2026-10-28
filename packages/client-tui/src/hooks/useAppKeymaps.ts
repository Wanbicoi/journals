import { useKeyboard } from "@opentui/react";
import type { Tab } from "../contexts/navigation.js";
import { matchesBinding } from "../keymap.js";
import { useScopedKeymaps } from "./useScopedKeymaps.js";

export type { Tab };

const TABS: Tab[] = ["DASHBOARD", "TIMELINE", "REFLECTIONS", "PROJECTS"];

export interface UseAppKeymapsOptions {
  currentTab: Tab;
  onSelectTab: (tab: Tab) => void;
  onOpenFilter: () => void;
  onOpenHelp: () => void;
  onRefresh: () => Promise<void> | void;
  onClearFilter: () => void;
  onQuit: () => void;
}

/**
 * The global keymap: view switching, search, help, refresh, clear-filter, and quit. View keys live
 * in each view's own scope, so this hook never lists a letter. Ctrl+C still quits while a modal is
 * open, which is why it is handled before the scoped dispatcher.
 */

// @unit journals.hooks.app-keymaps
// @summary Dispatch the global keys
// @details Tab switching, search, help, refresh, clear-filter, and quit are true regardless of the
// | active panel; each view owns its own key scope.
export function useAppKeymaps({
  currentTab,
  onSelectTab,
  onOpenFilter,
  onOpenHelp,
  onRefresh,
  onClearFilter,
  onQuit,
}: UseAppKeymapsOptions) {
  useKeyboard((key) => {
    if (key.ctrl && matchesBinding(key, "c")) onQuit();
  });

  useScopedKeymaps("global", {
    view_dashboard: () => onSelectTab("DASHBOARD"),
    view_timeline: () => onSelectTab("TIMELINE"),
    view_reflections: () => onSelectTab("REFLECTIONS"),
    view_projects: () => onSelectTab("PROJECTS"),
    next_view: () => onSelectTab(TABS[(TABS.indexOf(currentTab) + 1) % TABS.length]),
    // @call journals.modals.filter Open the search filter
    search_filter: () => onOpenFilter(),
    // @call journals.modals.help Open the keyboard help
    help: () => onOpenHelp(),
    // @call journals.hooks.refresh Refresh every cached query
    refresh: () => void onRefresh(),
    // @call journals.contexts.navigation Clear the active view's filter
    cancel: () => onClearFilter(),
    quit: () => onQuit(),
  });
}
