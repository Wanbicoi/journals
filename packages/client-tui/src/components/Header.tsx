import { useIcons } from "../contexts/icons.js";
import { useLayout } from "../contexts/layout.js";
import { TABS, TAB_LABELS, useNavigation } from "../contexts/navigation.js";
import { useTheme } from "../contexts/theme.js";

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
          {TABS.map((id, index) => {
            const isActive = tab === id;
            const label = `[${index + 1}] ${TAB_LABELS[id]}`;
            return (
              <box key={id} marginRight={1} onMouseDown={() => navigate(id)}>
                {isActive ? (
                  <text bg={theme.selectedBg} fg={theme.selectedFg}>
                    {` ${label} `}
                  </text>
                ) : (
                  <text fg={theme.muted}>{` ${label} `}</text>
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
