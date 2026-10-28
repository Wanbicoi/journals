import { useState } from "react";
import { ErrorState } from "../../components/ErrorState.js";
import { useIcons } from "../../contexts/icons.js";
import { useModals } from "../../contexts/modals.js";
import { useNavigation } from "../../contexts/navigation.js";
import { useTheme } from "../../contexts/theme.js";
import {
  DASHBOARD_POLL_INTERVAL_MS,
  useDashboardAnalytics,
  useProjects,
} from "../../hooks/queries.js";
import { useEntryMutations } from "../../hooks/useEntryMutations.js";
import { DashboardActivityChart } from "./DashboardActivityChart.js";
import { DashboardAttention } from "./DashboardAttention.js";
import { DashboardTodayPanel } from "./DashboardTodayPanel.js";
import { useDashboardKeymaps } from "./useDashboardKeymaps.js";

// @unit journals.views.dashboard
// @summary Dashboard view: streaks and the activity chart
export function DashboardView() {
  const icons = useIcons();
  const theme = useTheme();
  const { navigate, tab } = useNavigation();
  const { open } = useModals();
  const { quickCapture } = useEntryMutations();
  const [focusedDayIdx, setFocusedDayIdx] = useState(59);
  const isActive = tab === "DASHBOARD";

  // @call journals.hooks.dashboard Load the 60-day dashboard analytics
  const {
    data: dashboard = null,
    isLoading,
    isError,
    error,
    refetch,
  } = useDashboardAnalytics(60, {
    enabled: isActive,
    refetchInterval: DASHBOARD_POLL_INTERVAL_MS,
  });
  // @call journals.hooks.projects Load projects to count configured routines
  const { data: projects = [] } = useProjects();

  // The chart may return fewer days than the default focus; clamp before reading the series.
  const focusedDay = dashboard
    ? Math.min(focusedDayIdx, Math.max(0, dashboard.days.length - 1))
    : 0;

  // @call journals.hooks.capture Capture a routine completion
  const { completeRoutine } = useDashboardKeymaps({
    dashboard,
    focusedDayIdx: focusedDay,
    // @call journals.views.dashboard-chart Focus a day in the chart
    onFocusDayIdx: setFocusedDayIdx,
    // @call journals.contexts.navigation Navigate to the selected day
    onNavigateDate: (dateStr) => navigate("TIMELINE", dateStr),
    onQuickCapture: (text) => quickCapture(text),
    // @call journals.contexts.modals Open the quick capture modal
    onOpenCapture: () => open({ name: "capture" }),
  });

  if (isError) {
    // @call journals.views.error-state Show a load error and offer a retry
    return <ErrorState error={error} onRetry={refetch} />;
  }

  if (isLoading || !dashboard) {
    return (
      <box padding={1}>
        <text fg={theme.muted}>{"Loading your dashboard..."}</text>
      </box>
    );
  }

  const overdueCount = dashboard.activeDebts.length;
  const breakCount = dashboard.activeBreaks.length;
  const recurringCount = projects.filter((project) => project.recurrence).length;

  return (
    <scrollbox flexGrow={1} paddingLeft={1} paddingRight={1} paddingTop={1}>
      <DashboardTodayPanel dashboard={dashboard} onCompleteRoutine={completeRoutine} />
      <DashboardActivityChart
        dashboard={dashboard}
        focusedDayIdx={focusedDay}
        onFocusIdx={setFocusedDayIdx}
        onNavigateDate={(dateStr) => navigate("TIMELINE", dateStr)}
      />
      <DashboardAttention dashboard={dashboard} />

      {/* Quiet footer when there is nothing to catch up on */}
      {overdueCount === 0 && breakCount === 0 && recurringCount > 0 && (
        <box marginTop={1}>
          <text fg={theme.muted}>
            {`${icons.checked} All caught up ${icons.bullet} ${recurringCount} routine${recurringCount === 1 ? "" : "s"} configured`}
          </text>
        </box>
      )}
    </scrollbox>
  );
}
