import { useIcons } from "../contexts/icons.js";
import { useLayout } from "../contexts/layout.js";
import { type Tab, useNavigation } from "../contexts/navigation.js";
import { useTheme } from "../contexts/theme.js";

const TABS: { id: Tab; label: string }[] = [
  { id: "DASHBOARD", label: "[1] Dashboard" },
  { id: "TIMELINE", label: "[2] Timeline" },
  { id: "REFLECTIONS", label: "[3] Reflections" },
  { id: "PROJECTS", label: "[4] Projects" },
];

// @unit journals.views.header
// @summary Render the header and its view tabs
export function Header() {
  const theme = useTheme();
  const icons = useIcons();
  const { width } = useLayout();
  const { tab, navigate } = useNavigation();

  return (
    <box height={2} flexDirection="column">
      <box flexDirection="row" justifyContent="space-between">
        <box flexDirection="row">
          <text fg={theme.primary}>{`${icons.journal} JOURNALS  `}</text>
          {TABS.map((item) => {
            const isActive = tab === item.id;
            return (
              <box key={item.id} marginRight={1} onMouseDown={() => navigate(item.id)}>
                {isActive ? (
                  <text bg={theme.selectedBg} fg={theme.selectedFg}>
                    {` ${item.label} `}
                  </text>
                ) : (
                  <text fg={theme.muted}>{` ${item.label} `}</text>
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
