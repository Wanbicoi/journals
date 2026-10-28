import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from "react";
import { useNotifications } from "./notification.js";

export type Tab = "DASHBOARD" | "TIMELINE" | "REFLECTIONS" | "PROJECTS";

const TABS: Tab[] = ["DASHBOARD", "TIMELINE", "REFLECTIONS", "PROJECTS"];

const TAB_LABELS: Record<Tab, string> = {
  DASHBOARD: "Dashboard View",
  TIMELINE: "Timeline View",
  REFLECTIONS: "Reflections View",
  PROJECTS: "Projects View",
};

type Filters = Record<Tab, string>;

export interface NavigationValue {
  tab: Tab;
  /** The active view's search query. */
  filter: string;
  tabs: Tab[];
  /** Switch views, optionally with the filter the destination should open on. */
  navigate: (tab: Tab, filter?: string) => void;
  /** Replace the active view's filter. */
  setFilter: (filter: string) => void;
  /** Clear the active view's filter. Returns whether there was one to clear. */
  clearFilter: () => boolean;
}

interface NavigationProviderProps {
  children: ReactNode;
  initialTab?: Tab;
}

const NavigationContext = createContext<NavigationValue | null>(null);

const emptyFilters: Filters = {
  DASHBOARD: "",
  TIMELINE: "",
  REFLECTIONS: "",
  PROJECTS: "",
};

// @unit journals.contexts.navigation
// @summary Track the active view and its search filter
// @details One route-shaped value, `{ tab, filter }`, is the TUI's URL: the header, the status
// | bar, and the active screen all read it instead of passing tab and query props down.
export function NavigationProvider({
  children,
  initialTab = "DASHBOARD",
}: NavigationProviderProps) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const { notify } = useNotifications();

  // @call journals.contexts.notification Report the view change
  const navigate = useCallback(
    (nextTab: Tab, nextFilter?: string) => {
      setTab(nextTab);
      if (nextFilter !== undefined) {
        setFilters((prev) => ({ ...prev, [nextTab]: nextFilter }));
      }
      notify(TAB_LABELS[nextTab]);
    },
    [notify],
  );

  const setFilter = useCallback(
    (nextFilter: string) => {
      setFilters((prev) => ({ ...prev, [tab]: nextFilter }));
    },
    [tab],
  );

  const clearFilter = useCallback(() => {
    if (!filters[tab]) return false;
    setFilters((prev) => ({ ...prev, [tab]: "" }));
    return true;
  }, [filters, tab]);

  const value = useMemo<NavigationValue>(
    () => ({ tab, filter: filters[tab], tabs: TABS, navigate, setFilter, clearFilter }),
    [tab, filters, navigate, setFilter, clearFilter],
  );

  return <NavigationContext value={value}>{children}</NavigationContext>;
}

export function useNavigation(): NavigationValue {
  const value = useContext(NavigationContext);
  if (!value) throw new Error("useNavigation must be used within <NavigationProvider>");
  return value;
}
