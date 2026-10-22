import React from "react";
import type { ThemePalette } from "../theme.js";

interface StatusBarProps {
  width: number;
  filterQuery: string;
  statusMessage: string;
  theme: ThemePalette;
}

export function StatusBar({ width, filterQuery, statusMessage, theme }: StatusBarProps) {
  return (
    <box height={2} flexDirection="column">
      <text fg={theme.border}>{"─".repeat(width)}</text>
      <box flexDirection="row">
        {filterQuery && <text fg={theme.accent}>{`[Filter: "${filterQuery}"] `}</text>}
        <text fg={theme.primary}>{"[1]"}</text>
        <text fg={theme.fg}>{"Stream "}</text>
        <text fg={theme.primary}>{"[2]"}</text>
        <text fg={theme.fg}>{"Projects "}</text>
        <text fg={theme.primary}>{"[n]"}</text>
        <text fg={theme.fg}>{"Note "}</text>
        <text fg={theme.primary}>{"[N]"}</text>
        <text fg={theme.fg}>{"Project "}</text>
        <text fg={theme.primary}>{"[/]"}</text>
        <text fg={theme.fg}>{"Filter "}</text>
        <text fg={theme.primary}>{"[?]"}</text>
        <text fg={theme.fg}>{"Help "}</text>
        <text fg={theme.primary}>{"[q]"}</text>
        <text fg={theme.fg}>{"Quit "}</text>
        <text fg={theme.muted}>{statusMessage}</text>
      </box>
    </box>
  );
}
