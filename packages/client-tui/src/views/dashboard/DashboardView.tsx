import { useIcons } from "../../contexts/icons.js";
import { useTheme } from "../../contexts/theme.js";
import type { DashboardData, Project } from "../../hooks/useJournalData.js";
import { DashboardActivityChart } from "./DashboardActivityChart.js";
import { DashboardAttention } from "./DashboardAttention.js";
import { DashboardTodayPanel } from "./DashboardTodayPanel.js";
import { useDashboardKeymaps } from "./useDashboardKeymaps.js";

interface DashboardViewProps {
  dashboard: DashboardData | null;
  projects: Project[];
  loading?: boolean;
  focusedDayIdx: number;
  onNavigateDate: (dateStr: string) => void;
  isActive?: boolean;
  onFocusDayIdx?: (idx: number) => void;
  onStatusMessage?: (msg: string) => void;
  onQuickCapture?: (text: string) => Promise<void> | void;
  onToggleRoutine?: (
    routine: NonNullable<DashboardData["todayRoutines"]>[number],
  ) => Promise<void> | void;
}

// @unit journals.views.dashboard
// @summary Dashboard view: streaks and the activity chart
export function DashboardView({
  dashboard,
  projects,
  loading = false,
  focusedDayIdx,
  onNavigateDate,
  isActive = true,
  onFocusDayIdx,
  onStatusMessage,
  onQuickCapture,
  onToggleRoutine,
}: DashboardViewProps) {
  const icons = useIcons();
  const theme = useTheme();
  // @call journals.server.capture Capture a routine completion
  const { completeRoutine } = useDashboardKeymaps({
    dashboard,
    focusedDayIdx,
    isActive,
    // @call journals.views.dashboard-chart Focus a day in the chart
    onFocusDayIdx,
    // @call journals.hooks.navigation Navigate to a date
    onNavigateDate,
    // @call journals.views.chrome Show the status message
    onStatusMessage,
    // @call journals.server.capture Quick capture a line
    onQuickCapture,
    // @call journals.server.capture Complete a routine with a capture
    onToggleRoutine,
  });

  if (loading || !dashboard) {
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
        focusedDayIdx={focusedDayIdx}
        onFocusIdx={onFocusDayIdx}
        onNavigateDate={onNavigateDate}
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
