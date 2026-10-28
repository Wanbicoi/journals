import { formatRecurrenceRule } from "@journals/core";
import type { DashboardData } from "../../hooks/queries.js";
import type { ThemePalette } from "../../theme.js";

type DashboardStatus = DashboardData["status"];

export function statusColor(status: DashboardStatus, theme: ThemePalette): string {
  if (status === "NORMAL") return theme.success || "green";
  if (status === "DEGRADED") return theme.warning || "yellow";
  return theme.error || "red";
}

export function statusLabel(status: DashboardStatus): string {
  if (status === "NORMAL") return "On track";
  if (status === "DEGRADED") return "Behind on routines";
  return "No entries in 3 days";
}

export function formatRoutine(recurrence: string): string {
  return formatRecurrenceRule(recurrence) || recurrence;
}
