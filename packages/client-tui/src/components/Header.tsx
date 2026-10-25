import type { ThemePalette } from "../theme.js";

interface HeaderProps {
  width: number;
  currentTab: "DASHBOARD" | "TIMELINE" | "REFLECTIONS" | "PROJECTS";
  onSelectTab?: (tab: "DASHBOARD" | "TIMELINE" | "REFLECTIONS" | "PROJECTS") => void;
  journalIcon: string;
  theme: ThemePalette;
}

export function Header({ width, currentTab, onSelectTab, journalIcon, theme }: HeaderProps) {
  const tabs: { id: "DASHBOARD" | "TIMELINE" | "REFLECTIONS" | "PROJECTS"; label: string }[] = [
    { id: "DASHBOARD", label: "[1] Dashboard" },
    { id: "TIMELINE", label: "[2] Timeline" },
    { id: "REFLECTIONS", label: "[3] Reflections" },
    { id: "PROJECTS", label: "[4] Projects" },
  ];

  return (
    <box height={2} flexDirection="column">
      <box flexDirection="row" justifyContent="space-between">
        <box flexDirection="row">
          <text fg={theme.primary}>{`${journalIcon} JOURNALS  `}</text>
          {tabs.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <box key={tab.id} marginRight={1} onMouseDown={() => onSelectTab?.(tab.id)}>
                {isActive ? (
                  <text bg={theme.selectedBg} fg={theme.selectedFg}>
                    {` ${tab.label} `}
                  </text>
                ) : (
                  <text fg={theme.muted}>{` ${tab.label} `}</text>
                )}
              </box>
            );
          })}
        </box>
        <box flexDirection="row">
          <text fg={theme.muted}>{"[?] Help"}</text>
        </box>
      </box>
      <text fg={theme.border}>{"─".repeat(width)}</text>
    </box>
  );
}
