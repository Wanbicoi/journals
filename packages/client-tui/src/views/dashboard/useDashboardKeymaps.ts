import { useNotifications } from "../../contexts/notification.js";
import type { DashboardData } from "../../hooks/queries.js";
import { useScopedKeymaps } from "../../hooks/useScopedKeymaps.js";
import { clampIndex } from "../../hooks/useSelection.js";

type Routine = NonNullable<DashboardData["todayRoutines"]>[number];

interface UseDashboardKeymapsOptions {
  dashboard: DashboardData | null;
  focusedDayIdx: number;
  onFocusDayIdx?: (idx: number) => void;
  onNavigateDate: (dateStr: string) => void;
  onQuickCapture?: (text: string) => Promise<void> | void;
  onOpenCapture?: () => void;
}

export function useDashboardKeymaps({
  dashboard,
  focusedDayIdx,
  onFocusDayIdx,
  onNavigateDate,
  onQuickCapture,
  onOpenCapture,
}: UseDashboardKeymapsOptions) {
  const { notify } = useNotifications();
  const dayCount = dashboard?.days.length || 60;

  // Mark a routine done by logging the capture that completes it.
  const completeRoutine = async (routine: Routine) => {
    if (!onQuickCapture) return;
    await onQuickCapture(`Completed @${routine.projectName} routine`);
    notify(`Completed today's routine for @${routine.projectName}!`);
  };

  useScopedKeymaps("dashboard", {
    day_prev: () => onFocusDayIdx?.(clampIndex(focusedDayIdx - 1, dayCount)),
    day_next: () => onFocusDayIdx?.(clampIndex(focusedDayIdx + 1, dayCount)),

    toggle_routine: async () => {
      const pending = dashboard?.todayRoutines?.find((r) => r.isDueToday && !r.isCompletedToday);
      if (pending) await completeRoutine(pending);
    },

    open_day: () => {
      const day = dashboard?.days[focusedDayIdx];
      if (day) onNavigateDate(day.date);
    },

    quick_capture: () => onOpenCapture?.(),
  });

  return { completeRoutine };
}
