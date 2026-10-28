import { useIcons } from "../contexts/icons.js";
import type { Keymaps } from "../contexts/keymaps.js";
import { useKeymaps } from "../contexts/keymaps.js";
import { useLayout } from "../contexts/layout.js";
import { TABS, TAB_LABELS, type Tab, useNavigation } from "../contexts/navigation.js";
import { useTheme } from "../contexts/theme.js";
import { bindingLabel } from "../keymap.js";

const TAB_ACTIONS: Record<Tab, keyof Keymaps["global"]> = {
  DASHBOARD: "view_dashboard",
  TIMELINE: "view_timeline",
  REFLECTIONS: "view_reflections",
  PROJECTS: "view_projects",
};

// @unit journals.views.header
// @summary Render the header and its view tabs
export function Header() {
  const theme = useTheme();
  const icons = useIcons();
  const keymaps = useKeymaps();
  const { width } = useLayout();
  const { tab, navigate } = useNavigation();

  return (
    <box height={2} flexDirection="column">
      <box flexDirection="row" justifyContent="space-between">
        <box flexDirection="row">
          <text fg={theme.primary}>{`${icons.journal} JOURNALS  `}</text>
          {TABS.map((id) => {
            const isActive = tab === id;
            const label = `[${bindingLabel(keymaps.global[TAB_ACTIONS[id]])}] ${TAB_LABELS[id]}`;
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
          <text fg={theme.muted}>{`[${bindingLabel(keymaps.global.help)}] Help`}</text>
        </box>
      </box>
      <text fg={theme.border}>{"─".repeat(width)}</text>
    </box>
  );
}
