import type { PeriodDetail, PeriodItemStatus, ReflectionPeriodType } from "@journals/core";
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
  reflections: {
    all: ["reflections"] as const,
    periods: (periodType: ReflectionPeriodType) => ["reflections", "periods", periodType] as const,
    detail: (periodType: ReflectionPeriodType, periodKey: string) =>
      ["reflections", "detail", periodType, periodKey] as const,
  },
};

export function useEntries(options?: { refetchInterval?: number | false; enabled?: boolean }) {
  return useQuery<Entry[]>({
    queryKey: queryKeys.entries,
    queryFn: async () => ((await fetchEntries()) as Entry[]) || [],
    refetchInterval: options?.refetchInterval ?? 5000,
    enabled: options?.enabled ?? true,
  });
}

export function useProjects(options?: { refetchInterval?: number | false; enabled?: boolean }) {
  return useQuery<Project[]>({
    queryKey: queryKeys.projects,
    queryFn: async () => ((await fetchProjects()) as Project[]) || [],
    refetchInterval: options?.refetchInterval ?? 5000,
    enabled: options?.enabled ?? true,
  });
}

export function useTags(options?: { refetchInterval?: number | false; enabled?: boolean }) {
  return useQuery<TagInfo[]>({
    queryKey: queryKeys.tags,
    queryFn: async () => ((await fetchTags()) as TagInfo[]) || [],
    refetchInterval: options?.refetchInterval ?? 5000,
    enabled: options?.enabled ?? true,
  });
}

export function useDashboardAnalytics(
  days = 60,
  options?: { enabled?: boolean; refetchInterval?: number | false },
) {
  const isEnabled = options?.enabled ?? true;
  return useQuery<DashboardData | null>({
    queryKey: queryKeys.dashboard(days),
    queryFn: async () => {
      try {
        return (await fetchDashboardAnalytics(days)) as DashboardData;
      } catch {
        return null;
      }
    },
    enabled: isEnabled,
    refetchInterval: isEnabled ? (options?.refetchInterval ?? 5000) : false,
  });
}

export function useReflectionPeriods(
  periodType: ReflectionPeriodType,
  options?: { enabled?: boolean },
) {
  return useQuery<PeriodItemStatus[]>({
    queryKey: queryKeys.reflections.periods(periodType),
    queryFn: async () => (await fetchPeriodsApi(periodType)) || [],
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
