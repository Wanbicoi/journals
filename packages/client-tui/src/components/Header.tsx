import type { ThemePalette } from "../theme.js";

interface HeaderProps {
  width: number;
  currentTab: "TIMELINE" | "REFLECTIONS" | "PROJECTS";
  onSelectTab?: (tab: "TIMELINE" | "REFLECTIONS" | "PROJECTS") => void;
  journalIcon: string;
  theme: ThemePalette;
}

export function Header({ width, currentTab, onSelectTab, journalIcon, theme }: HeaderProps) {
  return (
    <box height={2} flexDirection="column">
      <box flexDirection="row">
        <text fg={theme.primary}>{`${journalIcon} JOURNALS`}</text>
        <text> </text>
        <box onMouseDown={() => onSelectTab?.("TIMELINE")}>
          {currentTab === "TIMELINE" ? (
            <text bg={theme.secondary} fg={theme.selectedFg}>
              {" [1] Timeline "}
            </text>
          ) : (
            <text fg={theme.muted}>{" [1] Timeline "}</text>
          )}
        </box>
        <text> </text>
        <box onMouseDown={() => onSelectTab?.("REFLECTIONS")}>
          {currentTab === "REFLECTIONS" ? (
            <text bg={theme.primary} fg={theme.selectedFg}>
              {" [2] Reflections "}
            </text>
          ) : (
            <text fg={theme.muted}>{" [2] Reflections "}</text>
          )}
        </box>
        <text> </text>
        <box onMouseDown={() => onSelectTab?.("PROJECTS")}>
          {currentTab === "PROJECTS" ? (
            <text bg={theme.accent} fg={theme.selectedFg}>
              {" [3] Projects "}
            </text>
          ) : (
            <text fg={theme.muted}>{" [3] Projects "}</text>
          )}
        </box>
      </box>
      <text fg={theme.border}>{"─".repeat(width)}</text>
    </box>
  );
}
