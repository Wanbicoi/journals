import type { ThemePalette } from "../theme.js";

interface StatusBarProps {
  width: number;
  filterQuery: string;
  statusMessage: string;
  theme: ThemePalette;
}

export function StatusBar({ width, filterQuery, statusMessage, theme }: StatusBarProps) {
  // Truncate or fit status info cleanly
  const leftMsg = filterQuery ? `[Filter: "${filterQuery}"] ${statusMessage}` : statusMessage;

  // Shortcuts hint for quick reference
  const hints = "[1]Stream [2]Proj [n]Note [e]Edit [d]Del [?]Help";

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
