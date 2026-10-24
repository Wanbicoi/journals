import { rrulestr } from "rrule";
import type { DatabaseInstance } from "../../db/client.js";
import { entries, projects } from "../../db/schema.js";

export interface DayMetric {
  date: string; // YYYY-MM-DD
  timestamp: number;
  entryCount: number;
  breakDaysCount: number;
  dueProjectsCount: number;
  completedProjectsCount: number;
  missedProjectsCount: number;
  missedProjectNames: string[];
}

export interface ProjectDebtItem {
  projectId: string;
  projectName: string;
  recurrence: string;
  missedPolicy: string;
  accumulatedDebt: number;
  lastJournaledAt: number | null;
}

export interface DashboardSummary {
  days: DayMetric[];
  status: "NORMAL" | "DEGRADED" | "OUTAGE";
  totalEntries: number;
  totalBreakDays: number;
  activeDebts: ProjectDebtItem[];
  activeBreaks: {
    projectName: string | null;
    content: string;
    remainingDays: number;
    startDate: string;
  }[];
}

/**
 * Returns analytics for the past N days (default 60).
 */
export function getDashboardAnalytics(db: DatabaseInstance, numDays = 60): DashboardSummary {
  const allProjects = db.select().from(projects).all();
  const allEntries = db.select().from(entries).all();

  // Create list of dates from (today - numDays + 1) to today in UTC/local date YYYY-MM-DD
  const now = new Date();
  const days: DayMetric[] = [];
  const dateMap = new Map<string, DayMetric>();

  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dateStr = formatDateKey(d);
    const metric: DayMetric = {
      date: dateStr,
      timestamp: d.getTime(),
      entryCount: 0,
      breakDaysCount: 0,
      dueProjectsCount: 0,
      completedProjectsCount: 0,
      missedProjectsCount: 0,
      missedProjectNames: [],
    };
    days.push(metric);
    dateMap.set(dateStr, metric);
  }

  // Set of break dates: dateStr -> Set<projectId | "GLOBAL">
  const breaksByDate = new Map<string, Set<string>>();

  // Active breaks currently in effect today
  const _todayStr = formatDateKey(now);
  const activeBreaksList: DashboardSummary["activeBreaks"] = [];

  // Tally entries and breaks
  for (const entry of allEntries) {
    const entryDate = new Date(entry.createdAt);
    const entryDateStr = formatDateKey(entryDate);

    const metric = dateMap.get(entryDateStr);
    if (metric) {
      metric.entryCount += 1;
    }

    if (entry.breakDays > 0) {
      // Mark break across consecutive days starting from entryDate
      for (let offset = 0; offset < entry.breakDays; offset++) {
        const bd = new Date(
          entryDate.getFullYear(),
          entryDate.getMonth(),
          entryDate.getDate() + offset,
        );
        const bDateStr = formatDateKey(bd);
        const bMetric = dateMap.get(bDateStr);
        if (bMetric) {
          bMetric.breakDaysCount += 1;
        }

        let breakSet = breaksByDate.get(bDateStr);
        if (!breakSet) {
          breakSet = new Set();
          breaksByDate.set(bDateStr, breakSet);
        }
        breakSet.add(entry.projectId ?? "GLOBAL");
      }

      // Check if active today
      const diffMs = now.getTime() - entryDate.getTime();
      const diffDays = Math.floor(diffMs / (24 * 3600 * 1000));
      if (diffDays >= 0 && diffDays < entry.breakDays) {
        const remaining = entry.breakDays - diffDays;
        let projName: string | null = null;
        if (entry.projectId) {
          const p = allProjects.find((x) => x.id === entry.projectId);
          projName = p ? p.name : entry.projectId;
        }
        activeBreaksList.push({
          projectName: projName,
          content: entry.content,
          remainingDays: remaining,
          startDate: entryDateStr,
        });
      }
    }
  }

  // Calculate project recurrence dues and debts
  const startDate = new Date(days[0].timestamp);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(days[days.length - 1].timestamp);
  endDate.setHours(23, 59, 59, 999);

  // Group entries by project and date
  // projectId -> Set<dateStr>
  const projectEntriesByDate = new Map<string, Set<string>>();
  for (const entry of allEntries) {
    if (!entry.projectId) continue;
    let dates = projectEntriesByDate.get(entry.projectId);
    if (!dates) {
      dates = new Set();
      projectEntriesByDate.set(entry.projectId, dates);
    }
    dates.add(formatDateKey(new Date(entry.createdAt)));
  }

  const activeDebts: ProjectDebtItem[] = [];

  for (const project of allProjects) {
    if (!project.recurrence) continue;

    let occurrences: Date[] = [];
    try {
      const rruleText = project.recurrence.startsWith("RRULE:")
        ? project.recurrence
        : `RRULE:${project.recurrence}`;
      const rule = rrulestr(rruleText, {
        dtstart: new Date(project.createdAt),
      });
      occurrences = rule.between(startDate, endDate, true);
    } catch {
      // Invalid rrule fallback
      continue;
    }

    const completedDates = projectEntriesByDate.get(project.id) ?? new Set<string>();
    let projectDebt = 0;

    for (const occ of occurrences) {
      const occDateStr = formatDateKey(occ);
      const metric = dateMap.get(occDateStr);
      if (metric) {
        metric.dueProjectsCount += 1;
      }

      // Check if frozen by break
      const breakSet = breaksByDate.get(occDateStr);
      const isBroken = breakSet?.has("GLOBAL") || breakSet?.has(project.id);

      if (completedDates.has(occDateStr)) {
        if (metric) metric.completedProjectsCount += 1;
      } else if (!isBroken) {
        // Missed routine instance on this day!
        if (metric) {
          metric.missedProjectsCount += 1;
          metric.missedProjectNames.push(project.name);
        }
        if (project.missedPolicy === "accumulate") {
          projectDebt += 1;
        }
      }
    }

    if (projectDebt > 0 && project.missedPolicy === "accumulate") {
      // Find latest entry date
      let lastJournaledAt: number | null = null;
      for (const entry of allEntries) {
        if (entry.projectId === project.id) {
          if (lastJournaledAt === null || entry.createdAt > lastJournaledAt) {
            lastJournaledAt = entry.createdAt;
          }
        }
      }

      activeDebts.push({
        projectId: project.id,
        projectName: project.name,
        recurrence: project.recurrence,
        missedPolicy: project.missedPolicy,
        accumulatedDebt: projectDebt,
        lastJournaledAt,
      });
    }
  }

  const totalEntries = days.reduce((sum, d) => sum + d.entryCount, 0);
  const totalBreakDays = days.reduce((sum, d) => sum + d.breakDaysCount, 0);

  // Determine system routine status
  // If accumulated debt > 3 -> DEGRADED. If recent 3 days had 0 entries and no breaks -> OUTAGE.
  let status: DashboardSummary["status"] = "NORMAL";
  const recentDays = days.slice(-3);
  const recentEntries = recentDays.reduce((s, d) => s + d.entryCount, 0);
  const recentBreaks = recentDays.reduce((s, d) => s + d.breakDaysCount, 0);

  const totalDebt = activeDebts.reduce((sum, d) => sum + d.accumulatedDebt, 0);

  if (recentEntries === 0 && recentBreaks === 0 && days.length >= 3) {
    status = "OUTAGE";
  } else if (totalDebt >= 3) {
    status = "DEGRADED";
  }

  return {
    days,
    status,
    totalEntries,
    totalBreakDays,
    activeDebts,
    activeBreaks: activeBreaksList,
  };
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
