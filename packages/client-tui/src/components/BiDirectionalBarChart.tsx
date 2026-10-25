import type { ThemePalette } from "../theme.js";

export interface RoutineBarDataPoint {
  label: string; // e.g. "10-23"
  date: string; // full "YYYY-MM-DD"
  missedSpikes: number; // upward spikes: routine projects with NO journal on that day
  breakDays: number; // downward: break days for projects/global
  missedProjectNames: string[];
}

interface BiDirectionalBarChartProps {
  data: RoutineBarDataPoint[];
  height?: number;
  focusedIdx?: number;
  onNavigateDate?: (dateStr: string) => void;
  theme: ThemePalette;
  title?: string;
}

/**
 * Bi-directional terminal routine monitor chart inspired by termcn / OpenTUI.
 *
 * UPWARDS (+Y in Red/Orange): "Spikes" indicating missed projects with NO journal entries.
 * DOWNWARDS (-Y in Yellow/Blue): Break days (sick / vacation / pause).
 *
 * Fully supports keyboard focus, mouse hover/click, and navigation directly to that date's entries.
 */
export function BiDirectionalBarChart({
  data,
  height = 9,
  focusedIdx = data.length - 1,
  onNavigateDate,
  theme,
  title,
}: BiDirectionalBarChartProps) {
  // Determine scales safely
  const maxSpike = Math.max(1, ...data.map((d) => d.missedSpikes || 0));
  const maxBreak = Math.max(1, ...data.map((d) => d.breakDays || 0));

  const spikeHeight = Math.max(3, Math.floor((height * 2) / 3));
  const breakHeight = Math.max(2, height - spikeHeight);

  // Render positive spike rows (from spikeHeight down to 1)
  const spikeRows: string[] = [];
  for (let r = spikeHeight; r >= 1; r--) {
    const threshold = (r / spikeHeight) * maxSpike;
    let rowStr = "";
    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      if (d.missedSpikes >= threshold) {
        rowStr += "█";
      } else if (d.missedSpikes >= threshold - maxSpike / (spikeHeight * 2)) {
        rowStr += "▄";
      } else {
        rowStr += " ";
      }
    }
    spikeRows.push(rowStr);
  }

  // Baseline
  const baseline = "─".repeat(data.length);

  // Render negative break rows (from 1 down to breakHeight)
  const breakRows: string[] = [];
  for (let r = 1; r <= breakHeight; r++) {
    const threshold = (r / breakHeight) * maxBreak;
    let rowStr = "";
    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      if (d.breakDays >= threshold) {
        rowStr += "█";
      } else if (d.breakDays >= threshold - maxBreak / (breakHeight * 2)) {
        rowStr += "▀";
      } else {
        rowStr += " ";
      }
    }
    breakRows.push(rowStr);
  }

  // Cursor indicator line showing focused column
  let cursorLine = "";
  for (let i = 0; i < data.length; i++) {
    cursorLine += i === focusedIdx ? "▲" : " ";
  }

  // Generate date tick marks for first, middle, last
  const firstLabel = data[0]?.label || "";
  const lastLabel = data[data.length - 1]?.label || "";
  const midIndex = Math.floor(data.length / 2);
  const midLabel = data[midIndex]?.label || "";

  const gap1 = Math.max(1, midIndex - firstLabel.length);
  const gap2 = Math.max(1, data.length - midIndex - midLabel.length);
  const axisLabel =
    `${firstLabel}${" ".repeat(gap1)}${midLabel}${" ".repeat(gap2)}${lastLabel}`.slice(
      0,
      data.length,
    );

  const focusedDay = data[focusedIdx];

  return (
    <box flexDirection="column">
      {title && (
        <box flexDirection="row" justifyContent="space-between" marginBottom={0}>
          <text fg={theme.primary}>{title}</text>
          <box flexDirection="row">
            <text fg={theme.error || "red"}>{"▲ Missed  "}</text>
            <text fg={theme.warning || "yellow"}>{"▼ Break"}</text>
          </box>
        </box>
      )}

      {/* Upward Spikes (Missed Projects) */}
      <box flexDirection="column">
        {spikeRows.map((line, idx) => {
          const rowLevel = spikeHeight - idx;
          const valLabel =
            idx === 0
              ? String(maxSpike).padStart(3, " ")
              : idx === spikeRows.length - 1
                ? "  1"
                : "   ";
          return (
            <box key={`spike-level-${rowLevel}`} flexDirection="row">
              <text fg={theme.muted}>{`${valLabel} ┤ `}</text>
              <text fg={theme.error || "red"}>{line}</text>
            </box>
          );
        })}
      </box>

      {/* Baseline */}
      <box flexDirection="row">
        <text fg={theme.muted}>{"  0 ┼─"}</text>
        <text fg={theme.border}>{baseline}</text>
      </box>

      {/* Downward Breaks */}
      <box flexDirection="column">
        {breakRows.map((line, idx) => {
          const rowLevel = idx + 1;
          const valLabel =
            idx === breakRows.length - 1
              ? `-${maxBreak}`.padStart(3, " ")
              : idx === 0
                ? " -1"
                : "   ";
          return (
            <box key={`break-level-${rowLevel}`} flexDirection="row">
              <text fg={theme.muted}>{`${valLabel} ┤ `}</text>
              <text fg={theme.warning || "yellow"}>{line}</text>
            </box>
          );
        })}
      </box>

      {/* Focus Cursor line */}
      <box flexDirection="row">
        <text fg={theme.muted}>{"    │ "}</text>
        <text fg={theme.accent}>{cursorLine}</text>
      </box>

      {/* X-Axis Date Labels */}
      <box flexDirection="row">
        <text fg={theme.muted}>{"    │ "}</text>
        <text fg={theme.muted}>{axisLabel}</text>
      </box>

      {/* Interactive Inspector for Focused Date */}
      {focusedDay && (
        <box
          flexDirection="row"
          justifyContent="space-between"
          marginTop={1}
          paddingLeft={1}
          paddingRight={1}
          borderStyle="single"
          borderColor={theme.border}
        >
          <box flexDirection="row">
            <text fg={theme.primary}>{`Date: [ ${focusedDay.date} ] `}</text>
            <text fg={(focusedDay.missedSpikes || 0) > 0 ? theme.error || "red" : theme.muted}>
              {`Spikes: ${focusedDay.missedSpikes ?? 0} missed `}
            </text>
            {(focusedDay.missedProjectNames ?? []).length > 0 && (
              <text fg={theme.muted}>
                {`(${focusedDay.missedProjectNames.map((p) => `@${p}`).join(", ")}) `}
              </text>
            )}
            <text fg={(focusedDay.breakDays || 0) > 0 ? theme.warning || "yellow" : theme.muted}>
              {`| Breaks: ${focusedDay.breakDays ?? 0}d`}
            </text>
          </box>

          <box
            flexDirection="row"
            onMouseDown={() => {
              if (onNavigateDate) onNavigateDate(focusedDay.date);
            }}
          >
            <text bg={theme.primary} fg={theme.selectedFg}>
              {" [Click / Enter: Open Date in Timeline] "}
            </text>
          </box>
        </box>
      )}
    </box>
  );
}
