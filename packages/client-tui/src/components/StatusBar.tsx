import type { ThemePalette } from "../theme.js";

export type TabType = "DASHBOARD" | "TIMELINE" | "REFLECTIONS" | "PROJECTS";

interface StatusBarProps {
  width: number;
  filterQuery: string;
  statusMessage: string;
  theme: ThemePalette;
  currentTab?: TabType;
}

const TAB_HINTS: Record<TabType, string> = {
  DASHBOARD: "[Space] Toggle  [Enter] Timeline  [h/l] Day  [n] Note  [?] Help",
  TIMELINE: "[j/k] Move  [e] Edit  [n] Note  [d] Del  [o] $EDITOR  [/] Filter  [?] Help",
  REFLECTIONS: "[w/m/q/y] Cadence  [j/k] Move  [e/Enter] Write  [?] Help",
  PROJECTS: "[j/k] Move  [n] New  [P] Routine  [e/o] Edit  [/] Filter  [?] Help",
};

export function StatusBar({
  width,
  filterQuery,
  statusMessage,
  theme,
  currentTab = "TIMELINE",
}: StatusBarProps) {
  // Truncate or fit status info cleanly
  const leftMsg = filterQuery ? `[Filter: "${filterQuery}"] ${statusMessage}` : statusMessage;

  // Shortcuts hint for quick reference based on active tab
  const hints = TAB_HINTS[currentTab] || TAB_HINTS.TIMELINE;

  return (
    <box height={2} flexDirection="column">
      <text fg={theme.border}>{"─".repeat(width)}</text>
      <box flexDirection="row" justifyContent="space-between">
        <box flexDirection="row">
          <text fg={theme.primary}>{"❯ "}</text>
          <text fg={theme.fg}>{leftMsg}</text>
        </box>
        <text fg={theme.muted}>{hints}</text>
      </box>
    </box>
  );
}
