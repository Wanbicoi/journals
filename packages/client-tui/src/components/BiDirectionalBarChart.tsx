import type { IconSet } from "@journals/core";
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
  onFocusIdx?: (idx: number) => void;
  onNavigateDate?: (dateStr: string) => void;
  icons: IconSet;
  theme: ThemePalette;
  title?: string;
}

/**
 * Shorten a long list of project names so the focused-day line never wraps.
 */
function summarizeNames(names: string[], budget = 40): string {
  const shown: string[] = [];
  let used = 0;
  for (const name of names) {
    const piece = `${shown.length > 0 ? ", " : ""}${name}`;
    if (used + piece.length > budget) break;
    shown.push(name);
    used += piece.length;
  }
  const omitted = names.length - shown.length;
  return omitted > 0 ? `${shown.join(", ")} +${omitted}` : shown.join(", ");
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
  onFocusIdx,
  onNavigateDate,
  icons,
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

  // Generate date tick marks for first, middle, last, right-aligned to the plot width
  const labelAt = (idx: number) => data[idx]?.label || "";
  const axisBuffer = Array.from({ length: data.length }, () => " ");
  const writeAt = (text: string, pos: number) => {
    for (let i = 0; i < text.length; i++) {
      const at = pos + i;
      if (at >= 0 && at < axisBuffer.length) axisBuffer[at] = text[i];
    }
  };
  const firstLabel = labelAt(0);
  const midLabel = labelAt(Math.floor(data.length / 2));
  const lastLabel = labelAt(data.length - 1);
  writeAt(firstLabel, 0);
  writeAt(
    midLabel,
    Math.max(firstLabel.length + 1, Math.floor(data.length / 2) - Math.floor(midLabel.length / 2)),
  );
  writeAt(lastLabel, axisBuffer.length - lastLabel.length);
  const axisLabel = axisBuffer.join("");

  const focusedDay = data[focusedIdx];

  return (
    <box flexDirection="column">
      <box flexDirection="row" marginBottom={0}>
        {title && <text fg={theme.primary}>{title}</text>}
        <box flexDirection="row" marginLeft={title ? 3 : 0}>
          <text fg={theme.error || "red"}>{`${icons.chartUp} missed  `}</text>
          <text fg={theme.warning || "yellow"}>{`${icons.chartDown} breaks`}</text>
        </box>
      </box>

      {/* Upward Spikes (Missed Projects) */}
      <box flexDirection="column">
        {spikeRows.map((line, idx) => {
          const rowLevel = spikeHeight - idx;
          const valLabel =
            idx === 0
              ? String(maxSpike).padStart(3, " ")
              : idx === spikeRows.length - 1 && maxSpike > 1
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
            idx === 0
              ? " -1"
              : idx === breakRows.length - 1 && maxBreak > 1
                ? `-${maxBreak}`.padStart(3, " ")
                : "   ";
          return (
            <box key={`break-level-${rowLevel}`} flexDirection="row">
              <text fg={theme.muted}>{`${valLabel} ┤ `}</text>
              <text fg={theme.warning || "yellow"}>{line}</text>
            </box>
          );
        })}
      </box>

      {/* Focus Cursor line (each day is clickable) */}
      <box flexDirection="row">
        <text fg={theme.muted}>{"    │ "}</text>
        {data.map((d, i) => (
          <box
            key={`cursor-${d.date}`}
            onMouseDown={() => {
              onFocusIdx?.(i);
            }}
          >
            <text fg={theme.accent}>{i === focusedIdx ? icons.chartCursor : " "}</text>
          </box>
        ))}
      </box>

      {/* X-Axis Date Labels */}
      <box flexDirection="row">
        <text fg={theme.muted}>{"    │ "}</text>
        <text fg={theme.muted}>{axisLabel}</text>
      </box>

      {/* Focused day summary (Press Enter / click to open it) */}
      {focusedDay && (
        <box
          flexDirection="row"
          onMouseDown={() => {
            if (onNavigateDate) onNavigateDate(focusedDay.date);
          }}
        >
          <text fg={theme.primary} wrapMode="none">{`${focusedDay.date}  `}</text>
          <text fg={theme.muted} wrapMode="none">{`${icons.bullet}  `}</text>
          <text
            fg={(focusedDay.missedSpikes || 0) > 0 ? theme.error || "red" : theme.muted}
            wrapMode="none"
          >
            {focusedDay.missedSpikes ? `${focusedDay.missedSpikes} missed` : "nothing missed"}
          </text>
          {(focusedDay.missedProjectNames ?? []).length > 0 && (
            <text fg={theme.muted} wrapMode="none">
              {`  (${summarizeNames(focusedDay.missedProjectNames)})`}
            </text>
          )}
          <text fg={theme.muted} wrapMode="none">{`  ${icons.bullet}  `}</text>
          <text
            fg={(focusedDay.breakDays || 0) > 0 ? theme.warning || "yellow" : theme.muted}
            wrapMode="none"
          >
            {focusedDay.breakDays ? `${focusedDay.breakDays}d break` : "no break"}
          </text>
          <box flexGrow={1} />
          <text fg={theme.muted} wrapMode="none">
            {"[Enter] open day  "}
          </text>
        </box>
      )}
    </box>
  );
}
