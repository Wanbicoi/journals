import { formatRecurrenceRule } from "@journals/core";
import { useKeyboard } from "@opentui/react";
import { BiDirectionalBarChart } from "../../components/BiDirectionalBarChart.js";
import { useIcons } from "../../contexts/icons.js";
import { useKeymaps } from "../../contexts/keymaps.js";
import { useTheme } from "../../contexts/theme.js";
import type { DashboardData, Project } from "../../hooks/useJournalData.js";
import { matchesAnyBinding, matchesBinding } from "../../keymap.js";

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}...` : clean;
}

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
  const keymaps = useKeymaps();
  const dayCount = dashboard?.days.length || 60;

  // Mark a routine done, either through the toggle callback or a quick note.
  const completeRoutine = async (routine: NonNullable<DashboardData["todayRoutines"]>[number]) => {
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

  if (loading || !dashboard) {
    return (
      <box padding={1}>
        <text fg={theme.muted}>{"Loading your dashboard..."}</text>
      </box>
    );
  }

  // Map 60-day metrics to bar data points
  // Missed (+Y) = routines with no journal that day
  // Breaks (-Y) = break days
  const chartData = (dashboard.days || []).map((day) => ({
    label: day.date.slice(5), // "MM-DD"
    date: day.date,
    missedSpikes: day.missedProjectsCount ?? 0,
    breakDays: day.breakDaysCount ?? 0,
    missedProjectNames: day.missedProjectNames || [],
  }));

  const statusColor =
    dashboard.status === "NORMAL"
      ? theme.success || "green"
      : dashboard.status === "DEGRADED"
        ? theme.warning || "yellow"
        : theme.error || "red";

  const statusLabel =
    dashboard.status === "NORMAL"
      ? "On track"
      : dashboard.status === "DEGRADED"
        ? "Behind on routines"
        : "No entries in 3 days";

  const dueRoutines = (dashboard.todayRoutines ?? []).filter((r) => r.isDueToday);
  const doneCount = dueRoutines.filter((r) => r.isCompletedToday).length;
  const overdueCount = dashboard.activeDebts.length;
  const breakCount = dashboard.activeBreaks.length;
  const recurringCount = projects.filter((p) => p.recurrence).length;

  return (
    <scrollbox flexGrow={1} paddingLeft={1} paddingRight={1} paddingTop={1}>
      {/* Today's routines */}
      <box
        flexDirection="column"
        borderStyle="single"
        borderColor={theme.border}
        title={
          dueRoutines.length > 0
            ? `Today ${icons.bullet} ${doneCount} of ${dueRoutines.length} done`
            : "Today"
        }
        titleColor={theme.primary}
        paddingLeft={1}
        paddingRight={1}
      >
        {/* At-a-glance status */}
        <box flexDirection="row">
          <text fg={statusColor}>{`${icons.status} ${statusLabel}`}</text>
          <text fg={theme.muted}>
            {`  ${icons.bullet}  ${overdueCount} overdue  ${icons.bullet}  ${breakCount} on break`}
          </text>
        </box>
        {dueRoutines.map((routine) => {
          const ruleDesc = formatRecurrenceRule(routine.recurrence) || routine.recurrence;
          const isDone = routine.isCompletedToday;
          return (
            <box
              key={routine.projectId}
              flexDirection="row"
              justifyContent="space-between"
              onMouseDown={async () => {
                if (isDone) return;
                await completeRoutine(routine);
              }}
            >
              <box flexDirection="row">
                <text
                  fg={isDone ? theme.success || "green" : theme.muted}
                >{`${isDone ? icons.checked : icons.unchecked} `}</text>
                <text fg={isDone ? theme.muted : theme.secondary}>{`@${routine.projectName}`}</text>
              </box>
              <text fg={theme.muted}>{ruleDesc}</text>
            </box>
          );
        })}
        {dueRoutines.length === 0 && (
          <text fg={theme.muted}>
            {`${icons.checked} Nothing due today ${icons.bullet} press '${keymaps.quick_capture}' to log a note`}
          </text>
        )}
      </box>

      {/* 60-day activity chart */}
      <box
        flexDirection="column"
        borderStyle="single"
        borderColor={theme.border}
        title="Last 60 days"
        titleColor={theme.primary}
        paddingLeft={1}
        paddingRight={1}
        marginTop={1}
      >
        <BiDirectionalBarChart
          data={chartData}
          height={5}
          focusedIdx={focusedDayIdx}
          onFocusIdx={onFocusDayIdx}
          onNavigateDate={onNavigateDate}
          icons={icons}
          theme={theme}
        />
      </box>

      {/* Only surface what needs attention */}
      {(overdueCount > 0 || breakCount > 0) && (
        <box
          flexDirection="column"
          borderStyle="single"
          borderColor={theme.border}
          title="Needs attention"
          titleColor={theme.accent}
          paddingLeft={1}
          paddingRight={1}
          marginTop={1}
        >
          {dashboard.activeDebts.map((debt) => (
            <box key={debt.projectId} flexDirection="row" justifyContent="space-between">
              <text fg={theme.secondary}>{`${icons.overdue} @${debt.projectName}`}</text>
              <text fg={theme.error || "red"}>{`${debt.accumulatedDebt} to catch up`}</text>
            </box>
          ))}
          {dashboard.activeBreaks.map((b, i) => (
            <box key={`${b.startDate}-${i}`} flexDirection="row" justifyContent="space-between">
              <box flexDirection="row">
                <text fg={theme.secondary}>
                  {`${icons.break} ${b.projectName ? `@${b.projectName}` : "All projects"}  `}
                </text>
                <text fg={theme.muted}>{truncate(b.content, 32)}</text>
              </box>
              <text fg={theme.warning || "yellow"}>{`${b.remainingDays}d left`}</text>
            </box>
          ))}
        </box>
      )}

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
