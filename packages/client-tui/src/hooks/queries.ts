import type { PeriodDetail, PeriodItemStatus, ReflectionPeriodType } from "@journals/core";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import {
  fetchDashboardAnalytics,
  fetchEntries,
  fetchPeriodDetailApi,
  fetchPeriodsApi,
  fetchProjects,
  fetchTags,
} from "../api/client.js";

export interface Entry {
  id: string;
  projectId: string | null;
  projectName: string | null;
  content: string;
  tags: string[];
  breakDays: number;
  createdAt: number;
}

export interface Project {
  id: string;
  name: string;
  content: string;
  recurrence?: string | null;
  missedPolicy?: string;
  createdAt: number;
  entryCount: number;
}

export interface TagInfo {
  name: string;
  count: number;
}

export interface DashboardData {
  days: {
    date: string;
    timestamp: number;
    entryCount: number;
    breakDaysCount: number;
    dueProjectsCount: number;
    completedProjectsCount: number;
    missedProjectsCount: number;
    missedProjectNames: string[];
  }[];
  status: "NORMAL" | "DEGRADED" | "OUTAGE";
  totalEntries: number;
  totalBreakDays: number;
  activeDebts: {
    projectId: string;
    projectName: string;
    recurrence: string;
    missedPolicy: string;
    accumulatedDebt: number;
    lastJournaledAt: number | null;
  }[];
  activeBreaks: {
    projectName: string | null;
    content: string;
    remainingDays: number;
    startDate: string;
  }[];
  todayRoutines?: {
    projectId: string;
    projectName: string;
    recurrence: string;
    isDueToday: boolean;
    isCompletedToday: boolean;
  }[];
}

export const queryKeys = {
  entries: ["entries"] as const,
  projects: ["projects"] as const,
  tags: ["tags"] as const,
  dashboard: (days = 60) => ["dashboard", days] as const,
  dashboardAll: ["dashboard"] as const,
  reflections: {
    all: ["reflections"] as const,
    periods: (periodType: ReflectionPeriodType) => ["reflections", "periods", periodType] as const,
    detail: (periodType: ReflectionPeriodType, periodKey: string) =>
      ["reflections", "detail", periodType, periodKey] as const,
  },
};

/**
 * Every mutation declares the cache scopes it invalidates. Keeping the lists here means a new
 * queried key only has to be added once instead of at all 27 call sites.
 */
export const invalidationKeys = {
  capture: [
    queryKeys.entries,
    queryKeys.projects,
    queryKeys.tags,
    queryKeys.dashboardAll,
    queryKeys.reflections.all,
  ],
  projectCreated: [queryKeys.projects, queryKeys.dashboardAll],
  projectUpdated: [queryKeys.projects, queryKeys.dashboardAll],
  projectContent: [queryKeys.projects],
  projectDeleted: [
    queryKeys.projects,
    queryKeys.entries,
    queryKeys.dashboardAll,
    queryKeys.reflections.all,
  ],
  entryProject: [
    queryKeys.entries,
    queryKeys.projects,
    queryKeys.dashboardAll,
    queryKeys.reflections.all,
  ],
  entryTags: [queryKeys.entries, queryKeys.tags],
  entryContent: [queryKeys.entries, queryKeys.reflections.all],
  entryDeleted: [
    queryKeys.entries,
    queryKeys.projects,
    queryKeys.tags,
    queryKeys.dashboardAll,
    queryKeys.reflections.all,
  ],
  reflectionSaved: [queryKeys.reflections.all],
} satisfies Record<string, readonly QueryKey[]>;

export async function invalidateAfterMutation(
  queryClient: QueryClient,
  keys: readonly QueryKey[],
): Promise<void> {
  await Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

// @unit journals.hooks.entries
// @summary Query journal entries
export function useEntries(options?: { refetchInterval?: number | false }) {
  // @call journals.api.entries Fetch entries from the server
  return useQuery<Entry[]>({
    queryKey: queryKeys.entries,
    queryFn: async () => (await fetchEntries()) ?? [],
    refetchInterval: options?.refetchInterval ?? false,
  });
}

// @unit journals.hooks.projects
// @summary Query projects
export function useProjects() {
  // @call journals.api.projects Fetch projects from the server
  return useQuery<Project[]>({
    queryKey: queryKeys.projects,
    queryFn: async () => (await fetchProjects()) ?? [],
  });
}

// @unit journals.hooks.tags
// @summary Query tags
export function useTags() {
  // @call journals.api.tags Fetch tags from the server
  return useQuery<TagInfo[]>({
    queryKey: queryKeys.tags,
    queryFn: async () => (await fetchTags()) ?? [],
  });
}

/** Poll cadences for the views that stay fresh while their tab is on screen. */
export const DASHBOARD_POLL_INTERVAL_MS = 5_000;
export const TIMELINE_POLL_INTERVAL_MS = 3_000;

// @unit journals.hooks.dashboard
// @summary Query dashboard analytics
export function useDashboardAnalytics(
  days = 60,
  options?: { enabled?: boolean; refetchInterval?: number | false },
) {
  const isEnabled = options?.enabled ?? true;
  // @call journals.api.dashboard Fetch the dashboard summary from the server
  return useQuery<DashboardData>({
    queryKey: queryKeys.dashboard(days),
    queryFn: async () => await fetchDashboardAnalytics(days),
    enabled: isEnabled,
    refetchInterval: isEnabled ? (options?.refetchInterval ?? false) : false,
  });
}

export function useReflectionPeriods(periodType: ReflectionPeriodType) {
  return useQuery<PeriodItemStatus[]>({
    queryKey: queryKeys.reflections.periods(periodType),
    queryFn: async () => (await fetchPeriodsApi(periodType)) ?? [],
  });
}

export function useReflectionDetail(periodType?: ReflectionPeriodType, periodKey?: string | null) {
  return useQuery<PeriodDetail | null>({
    queryKey: queryKeys.reflections.detail(periodType ?? "WEEK", periodKey ?? ""),
    queryFn: async () => {
      if (!periodType || !periodKey) return null;
      return await fetchPeriodDetailApi(periodType, periodKey);
    },
    enabled: Boolean(periodType && periodKey),
  });
}
