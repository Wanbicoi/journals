import { useKeyboard } from "@opentui/react";
import type { DashboardData } from "../../hooks/useJournalData.js";
import { matchesAnyBinding, matchesBinding } from "../../keymap.js";

type Routine = NonNullable<DashboardData["todayRoutines"]>[number];

interface UseDashboardKeymapsOptions {
  dashboard: DashboardData | null;
  focusedDayIdx: number;
  isActive: boolean;
  onFocusDayIdx?: (idx: number) => void;
  onNavigateDate: (dateStr: string) => void;
  onStatusMessage?: (msg: string) => void;
  onQuickCapture?: (text: string) => Promise<void> | void;
  onToggleRoutine?: (routine: Routine) => Promise<void> | void;
}

export function useDashboardKeymaps({
  dashboard,
  focusedDayIdx,
  isActive,
  onFocusDayIdx,
  onNavigateDate,
  onStatusMessage,
  onQuickCapture,
  onToggleRoutine,
}: UseDashboardKeymapsOptions) {
  const dayCount = dashboard?.days.length || 60;

  // Mark a routine done, either through the toggle callback or a quick note.
  const completeRoutine = async (routine: Routine) => {
    if (onToggleRoutine) {
      await onToggleRoutine(routine);
    } else if (onQuickCapture) {
      await onQuickCapture(`Completed @${routine.projectName} routine`);
      onStatusMessage?.(`Completed today's routine for @${routine.projectName}!`);
    }
  };

  useKeyboard(async (key) => {
    if (!isActive) return;

    // Focus navigation: h/l and left/right
    if (matchesAnyBinding(key, "h", "left")) {
      onFocusDayIdx?.(Math.max(0, focusedDayIdx - 1));
    } else if (matchesAnyBinding(key, "l", "right")) {
      onFocusDayIdx?.(Math.min(dayCount - 1, focusedDayIdx + 1));
    } else if (matchesAnyBinding(key, "space", " ")) {
      // Today checklist routine completion toggle: Space
      const pending = dashboard?.todayRoutines?.find((r) => r.isDueToday && !r.isCompletedToday);
      if (pending) {
        await completeRoutine(pending);
      }
    } else if (matchesBinding(key, "return") && dashboard) {
      // Date jump: Enter
      const day = dashboard.days[focusedDayIdx];
      if (day) {
        onNavigateDate(day.date);
      }
    }
  });

  return { completeRoutine };
}
