import { useIcons } from "../../contexts/icons.js";
import { useTheme } from "../../contexts/theme.js";
import type { DashboardData } from "../../hooks/queries.js";

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}...` : clean;
}

interface DashboardAttentionProps {
  dashboard: DashboardData;
}

export function DashboardAttention({ dashboard }: DashboardAttentionProps) {
  const icons = useIcons();
  const theme = useTheme();
  const overdueCount = dashboard.activeDebts.length;
  const breakCount = dashboard.activeBreaks.length;

  // Only surface what needs attention
  if (overdueCount === 0 && breakCount === 0) return null;

  return (
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
          <text fg={theme.error}>{`${debt.accumulatedDebt} to catch up`}</text>
        </box>
      ))}
      {dashboard.activeBreaks.map((activeBreak, index) => (
        <box
          key={`${activeBreak.startDate}-${index}`}
          flexDirection="row"
          justifyContent="space-between"
        >
          <box flexDirection="row">
            <text fg={theme.secondary}>
              {`${icons.break} ${activeBreak.projectName ? `@${activeBreak.projectName}` : "All projects"}  `}
            </text>
            <text fg={theme.muted}>{truncate(activeBreak.content, 32)}</text>
          </box>
          <text fg={theme.warning}>{`${activeBreak.remainingDays}d left`}</text>
        </box>
      ))}
    </box>
  );
}
