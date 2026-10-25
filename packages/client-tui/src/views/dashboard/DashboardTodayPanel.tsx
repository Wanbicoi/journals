import { useIcons } from "../../contexts/icons.js";
import { useKeymaps } from "../../contexts/keymaps.js";
import { useTheme } from "../../contexts/theme.js";
import type { DashboardData } from "../../hooks/useJournalData.js";
import { formatRoutine, statusColor, statusLabel } from "./dashboardStatus.js";

type Routine = NonNullable<DashboardData["todayRoutines"]>[number];

interface DashboardTodayPanelProps {
  dashboard: DashboardData;
  onCompleteRoutine: (routine: Routine) => Promise<void> | void;
}

export function DashboardTodayPanel({ dashboard, onCompleteRoutine }: DashboardTodayPanelProps) {
  const icons = useIcons();
  const theme = useTheme();
  const keymaps = useKeymaps();

  const dueRoutines = (dashboard.todayRoutines ?? []).filter((routine) => routine.isDueToday);
  const doneCount = dueRoutines.filter((routine) => routine.isCompletedToday).length;

  return (
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
        <text fg={statusColor(dashboard.status, theme)}>
          {`${icons.status} ${statusLabel(dashboard.status)}`}
        </text>
        <text fg={theme.muted}>
          {`  ${icons.bullet}  ${dashboard.activeDebts.length} overdue  ${icons.bullet}  ${dashboard.activeBreaks.length} on break`}
        </text>
      </box>
      {dueRoutines.map((routine) => {
        const ruleDesc = formatRoutine(routine.recurrence);
        const isDone = routine.isCompletedToday;
        return (
          <box
            key={routine.projectId}
            flexDirection="row"
            justifyContent="space-between"
            onMouseDown={async () => {
              if (isDone) return;
              await onCompleteRoutine(routine);
            }}
          >
            <box flexDirection="row">
              <text
                fg={isDone ? theme.success || "green" : theme.muted}
              >{`${isDone ? icons.checked : icons.unchecked} `}</text>
              <text fg={isDone ? theme.muted : theme.secondary}>{`@${routine.projectName} `}</text>
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
  );
}
