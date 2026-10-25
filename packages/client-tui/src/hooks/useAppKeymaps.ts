import { useKeyboard } from "@opentui/react";
import { config } from "../api/client.js";
import { matchesAnyBinding, matchesBinding, normalizeKey } from "../keymap.js";

export type Tab = "DASHBOARD" | "TIMELINE" | "REFLECTIONS" | "PROJECTS";

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
  useKeyboard(async (key) => {
    const keymaps = config.keymaps;
    if (key.ctrl && matchesBinding(key, "c")) {
      onQuit();
      return;
    }
    if (modalOpen) return;

    if (matchesAnyBinding(key, keymaps.quit, "q")) {
      onQuit();
      return;
    }

    const tab = TAB_KEY_MAP[normalizeKey(key)];
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
