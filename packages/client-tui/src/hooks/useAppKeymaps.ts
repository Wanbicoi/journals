import { useKeyboard } from "@opentui/react";
import { useKeymaps } from "../contexts/keymaps.js";
import { matchesAnyBinding, matchesBinding, normalizeKey } from "../keymap.js";

export type Tab = "DASHBOARD" | "TIMELINE" | "REFLECTIONS" | "PROJECTS";

const TABS: Tab[] = ["DASHBOARD", "TIMELINE", "REFLECTIONS", "PROJECTS"];

function buildTabKeyMap(keymaps: ReturnType<typeof useKeymaps>): Record<string, Tab> {
  return {
    "1": "DASHBOARD",
    [keymaps.view_dashboard]: "DASHBOARD",
    "2": "TIMELINE",
    [keymaps.view_timeline]: "TIMELINE",
    "3": "REFLECTIONS",
    [keymaps.view_reflections]: "REFLECTIONS",
    "4": "PROJECTS",
    [keymaps.view_projects]: "PROJECTS",
  };
}

export interface UseAppKeymapsOptions {
  currentTab: Tab;
  modalOpen: boolean;
  onSelectTab: (tab: Tab) => void;
  onOpenFilter: () => void;
  onOpenHelp: () => void;
  onRefresh: () => Promise<void> | void;
  onClearFilter: () => void;
  onQuit: () => void;
}

/**
 * The screen-level keymap: navigation between tabs, global actions, and the quit intent. Views own
 * their own keys; this hook owns the ones that are true regardless of the active panel.
 */
export function useAppKeymaps({
  currentTab,
  modalOpen,
  onSelectTab,
  onOpenFilter,
  onOpenHelp,
  onRefresh,
  onClearFilter,
  onQuit,
}: UseAppKeymapsOptions) {
  const keymaps = useKeymaps();
  const tabKeyMap = buildTabKeyMap(keymaps);

  useKeyboard(async (key) => {
    if (key.ctrl && matchesBinding(key, "c")) {
      onQuit();
      return;
    }
    if (modalOpen) return;

    if (matchesAnyBinding(key, keymaps.quit, "q")) {
      onQuit();
      return;
    }

    const tab = tabKeyMap[normalizeKey(key)];
    if (tab) {
      onSelectTab(tab);
      return;
    }

    if (matchesBinding(key, "tab")) {
      onSelectTab(TABS[(TABS.indexOf(currentTab) + 1) % TABS.length]);
    } else if (matchesBinding(key, keymaps.search_filter)) {
      onOpenFilter();
    } else if (matchesBinding(key, keymaps.help)) {
      onOpenHelp();
    } else if (matchesBinding(key, keymaps.refresh)) {
      await onRefresh();
    } else if (matchesBinding(key, keymaps.cancel)) {
      onClearFilter();
    }
  });
}
