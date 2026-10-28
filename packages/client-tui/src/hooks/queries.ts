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
  everything: [
    queryKeys.entries,
    queryKeys.projects,
    queryKeys.tags,
    queryKeys.dashboardAll,
    queryKeys.reflections.all,
  ],
} satisfies Record<string, readonly QueryKey[]>;

export async function invalidateAfterMutation(
  queryClient: QueryClient,
  keys: readonly QueryKey[],
): Promise<void> {
  await Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

// @unit journals.hooks.entries
// @summary Query journal entries
export function useEntries(options?: { refetchInterval?: number | false; enabled?: boolean }) {
  // @call journals.api.entries Fetch entries from the server
  return useQuery<Entry[]>({
    queryKey: queryKeys.entries,
    queryFn: async () => (await fetchEntries()) ?? [],
    refetchInterval: options?.refetchInterval ?? false,
    enabled: options?.enabled ?? true,
  });
}

// @unit journals.hooks.projects
// @summary Query projects
export function useProjects(options?: { refetchInterval?: number | false; enabled?: boolean }) {
  // @call journals.api.projects Fetch projects from the server
  return useQuery<Project[]>({
    queryKey: queryKeys.projects,
    queryFn: async () => (await fetchProjects()) ?? [],
    refetchInterval: options?.refetchInterval ?? false,
    enabled: options?.enabled ?? true,
  });
}

// @unit journals.hooks.tags
// @summary Query tags
export function useTags(options?: { refetchInterval?: number | false; enabled?: boolean }) {
  // @call journals.api.tags Fetch tags from the server
  return useQuery<TagInfo[]>({
    queryKey: queryKeys.tags,
    queryFn: async () => (await fetchTags()) ?? [],
    refetchInterval: options?.refetchInterval ?? false,
    enabled: options?.enabled ?? true,
  });
}

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

export function useReflectionPeriods(
  periodType: ReflectionPeriodType,
  options?: { enabled?: boolean },
) {
  return useQuery<PeriodItemStatus[]>({
    queryKey: queryKeys.reflections.periods(periodType),
    queryFn: async () => (await fetchPeriodsApi(periodType)) ?? [],
    enabled: options?.enabled ?? true,
  });
}

export function useReflectionDetail(
  periodType?: ReflectionPeriodType,
  periodKey?: string | null,
  options?: { enabled?: boolean },
) {
  return useQuery<PeriodDetail | null>({
    queryKey: queryKeys.reflections.detail(periodType ?? "WEEK", periodKey ?? ""),
    queryFn: async () => {
      if (!periodType || !periodKey) return null;
      return await fetchPeriodDetailApi(periodType, periodKey);
    },
    enabled: (options?.enabled ?? true) && Boolean(periodType && periodKey),
  });
}

export function useReflections(
  periodType: ReflectionPeriodType,
  periodKey?: string | null,
  options?: { enabled?: boolean },
) {
  const periodsQuery = useReflectionPeriods(periodType, options);
  const detailQuery = useReflectionDetail(periodType, periodKey, options);

  return {
    periods: periodsQuery.data ?? [],
    currentDetail: detailQuery.data ?? null,
    loadingPeriods: periodsQuery.isLoading,
    loadingDetail: detailQuery.isLoading,
    loading: periodsQuery.isLoading || detailQuery.isLoading,
    refetchPeriods: periodsQuery.refetch,
    refetchDetail: detailQuery.refetch,
  };
}
