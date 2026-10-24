import { formatRecurrenceRule } from "@journals/core";
import { BiDirectionalBarChart } from "../../components/BiDirectionalBarChart.js";
import type { DashboardData, Project } from "../../hooks/useJournalData.js";
import type { ThemePalette } from "../../theme.js";

interface DashboardViewProps {
  dashboard: DashboardData | null;
  projects: Project[];
  loading?: boolean;
  focusedDayIdx: number;
  onNavigateDate: (dateStr: string) => void;
  theme: ThemePalette;
  quickCaptureKey: string;
}

export function DashboardView({
  dashboard,
  projects,
  loading = false,
  focusedDayIdx,
  onNavigateDate,
  theme,
  quickCaptureKey,
}: DashboardViewProps) {
  if (loading || !dashboard) {
    return (
      <box padding={1}>
        <text fg={theme.primary}>{"Loading dashboard telemetry..."}</text>
      </box>
    );
  }

  // Map 60-day metrics to bar data points
  // Spikes (+Y) = projects that didn't have any journal on that day
  // Breaks (-Y) = break days
  const chartData = (dashboard.days || []).map((day) => ({
    label: day.date.slice(5), // "MM-DD"
    date: day.date,
    missedSpikes: day.missedProjectsCount ?? 0,
    breakDays: day.breakDaysCount ?? 0,
    missedProjectNames: day.missedProjectNames || [],
  }));

  // Status color
  const statusColor =
    dashboard.status === "NORMAL"
      ? theme.success || "green"
      : dashboard.status === "DEGRADED"
        ? theme.warning || "yellow"
        : theme.error || "red";

  const totalSpikes = (dashboard.days || []).reduce((s, d) => s + (d.missedProjectsCount || 0), 0);

  return (
    <scrollbox flexGrow={1} paddingLeft={1} paddingRight={1}>
      {/* Telemetry Header */}
      <box
        flexDirection="row"
        justifyContent="space-between"
        borderStyle="single"
        borderColor={theme.border}
        paddingLeft={1}
        paddingRight={1}
        marginTop={0}
      >
        <box flexDirection="row">
          <text fg={theme.primary}>{"[ DAILY ROUTINE MONITOR ] "}</text>
          <text fg={theme.muted}>{"System State: "}</text>
          <text fg={statusColor}>{`● ${dashboard.status}`}</text>
        </box>
        <box flexDirection="row">
          <text fg={theme.muted}>{"Last 60 Days | "}</text>
          <text fg={totalSpikes > 0 ? theme.error || "red" : theme.muted}>
            {`Routine Spikes (Missed): ${totalSpikes}  `}
          </text>
          <text fg={theme.warning || "yellow"}>{`Breaks: ${dashboard.totalBreakDays}d`}</text>
        </box>
      </box>

      {/* 60-Day Bi-directional Monitor Chart */}
      <box
        flexDirection="column"
        borderStyle="single"
        borderColor={theme.border}
        paddingLeft={1}
        paddingRight={1}
        marginTop={1}
      >
        <BiDirectionalBarChart
          data={chartData}
          height={9}
          focusedIdx={focusedDayIdx}
          onNavigateDate={onNavigateDate}
          theme={theme}
          title="Routine Anomaly Monitor (Spikes = Missed Work, Breaks = Pause)"
        />
      </box>

      {/* Lower Dashboard Grid: Active Debts & Active Breaks & Recurrences */}
      <box flexDirection="row" marginTop={1}>
        {/* Left Column: Overdue Debt Queue */}
        <box
          flexDirection="column"
          flexGrow={1}
          borderStyle="single"
          borderColor={dashboard.activeDebts.length > 0 ? theme.warning || "yellow" : theme.border}
          paddingLeft={1}
          paddingRight={1}
          marginRight={1}
        >
          <box flexDirection="row" justifyContent="space-between">
            <text fg={theme.accent}>{"⚠ Overdue Backlog / Make-up Debt"}</text>
            <text fg={theme.muted}>{`${dashboard.activeDebts.length} projects`}</text>
          </box>
          {dashboard.activeDebts.length === 0 ? (
            <box marginTop={1} marginBottom={1}>
              <text fg={theme.muted}>{"✓ No routine debt. You are completely caught up!"}</text>
            </box>
          ) : (
            <box flexDirection="column" marginTop={1}>
              {dashboard.activeDebts.map((debt) => (
                <box key={debt.projectId} flexDirection="row" justifyContent="space-between">
                  <text fg={theme.secondary}>{`@${debt.projectName}`}</text>
                  <text fg={theme.error || "red"}>{`${debt.accumulatedDebt} entries owed`}</text>
                </box>
              ))}
            </box>
          )}
        </box>

        {/* Right Column: Active Breaks & Recurring Projects */}
        <box
          flexDirection="column"
          flexGrow={1}
          borderStyle="single"
          borderColor={theme.border}
          paddingLeft={1}
          paddingRight={1}
        >
          <box flexDirection="row" justifyContent="space-between">
            <text fg={theme.accent}>{"⏸ Active Breaks & Status"}</text>
            <text fg={theme.muted}>{`${dashboard.activeBreaks.length} active`}</text>
          </box>
          {dashboard.activeBreaks.length === 0 ? (
            <box marginTop={1} marginBottom={1}>
              <text fg={theme.muted}>
                {`No active break today. Use '${quickCaptureKey}' with '/break 3d' to pause.`}
              </text>
            </box>
          ) : (
            <box flexDirection="column" marginTop={1}>
              {dashboard.activeBreaks.map((b, i) => (
                <box key={`${b.startDate}-${i}`} flexDirection="column" marginBottom={1}>
                  <box flexDirection="row" justifyContent="space-between">
                    <text fg={theme.warning || "yellow"}>
                      {b.projectName ? `@${b.projectName}` : "🌐 Global (All Projects)"}
                    </text>
                    <text fg={theme.muted}>{`${b.remainingDays}d remaining`}</text>
                  </box>
                  <text fg={theme.fg}>{`  "${b.content}"`}</text>
                </box>
              ))}
            </box>
          )}
        </box>
      </box>

      {/* Routine Schedules Summary */}
      <box
        flexDirection="column"
        borderStyle="single"
        borderColor={theme.border}
        paddingLeft={1}
        paddingRight={1}
        marginTop={1}
        marginBottom={1}
      >
        <box flexDirection="row" justifyContent="space-between">
          <text fg={theme.primary}>{"📅 Configured Project Routines"}</text>
        </box>
        <box flexDirection="column" marginTop={1}>
          {projects
            .filter((p) => p.recurrence)
            .map((p) => (
              <box key={p.id} flexDirection="row" justifyContent="space-between">
                <box flexDirection="row">
                  <text fg={theme.secondary}>{`@${p.name} `}</text>
                  <text fg={theme.muted}>
                    {`(${formatRecurrenceRule(p.recurrence) || p.recurrence})`}
                  </text>
                </box>
                <text
                  fg={p.missedPolicy === "accumulate" ? theme.warning || "yellow" : theme.muted}
                >
                  {`policy: ${p.missedPolicy || "spike"}`}
                </text>
              </box>
            ))}
          {projects.filter((p) => p.recurrence).length === 0 && (
            <text fg={theme.muted}>
              {"No project recurrence configured yet. Press 'n' to create one with recurrence!"}
            </text>
          )}
        </box>
      </box>
    </scrollbox>
  );
}
