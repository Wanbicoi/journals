import type { ThemePalette } from "../theme.js";

interface HeaderProps {
  width: number;
  currentTab: "DASHBOARD" | "TIMELINE" | "PROJECTS";
  journalIcon: string;
  theme: ThemePalette;
}

export function Header({ width, currentTab, journalIcon, theme }: HeaderProps) {
  return (
    <box height={2} flexDirection="column">
      <box flexDirection="row">
        <text fg={theme.primary}>{`${journalIcon} JOURNALS`}</text>
        <text> </text>
        {currentTab === "DASHBOARD" ? (
          <text bg={theme.primary} fg={theme.selectedFg}>
            {" [1] Dashboard "}
          </text>
        ) : (
          <text fg={theme.muted}>{" [1] Dashboard "}</text>
        )}
        <text> </text>
        {currentTab === "TIMELINE" ? (
          <text bg={theme.secondary} fg={theme.selectedFg}>
            {" [2] Timeline "}
          </text>
        ) : (
          <text fg={theme.muted}>{" [2] Timeline "}</text>
        )}
        <text> </text>
        {currentTab === "PROJECTS" ? (
          <text bg={theme.primary} fg={theme.selectedFg}>
            {" [3] Projects "}
          </text>
        ) : (
          <text fg={theme.muted}>{" [3] Projects "}</text>
        )}
      </box>
      <text fg={theme.border}>{"─".repeat(width)}</text>
    </box>
  );
}
