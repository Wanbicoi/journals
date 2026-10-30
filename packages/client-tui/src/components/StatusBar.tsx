import { useIcons } from "../contexts/icons.js";
import type { Keymaps } from "../contexts/keymaps.js";
import { useKeymaps } from "../contexts/keymaps.js";
import { useLayout } from "../contexts/layout.js";
import { useNavigation } from "../contexts/navigation.js";
import { useNotifications } from "../contexts/notification.js";
import { useTheme } from "../contexts/theme.js";
import { bindingLabel } from "../keymap.js";

const TAB_HINTS: Record<string, (k: Keymaps) => string> = {
  DASHBOARD: (k) =>
    `[${bindingLabel(k.dashboard.toggle_routine)}] Complete  [${bindingLabel(k.dashboard.open_day)}] Open day  [${bindingLabel(k.dashboard.day_prev)}/${bindingLabel(k.dashboard.day_next)}] Day  [${bindingLabel(k.dashboard.quick_capture)}] Note  [${bindingLabel(k.global.quit)}] Quit`,
  TIMELINE: (k) =>
    `[${bindingLabel(k.timeline.down)}/${bindingLabel(k.timeline.up)}] Move  [${bindingLabel(k.timeline.edit_entry)}] Edit  [${bindingLabel(k.timeline.quick_capture)}] Note  [${bindingLabel(k.timeline.delete_entry)}] Del  [${bindingLabel(k.global.search_filter)}] Filter  [${bindingLabel(k.global.quit)}] Quit`,
  REFLECTIONS: (k) =>
    `[${bindingLabel(k.reflections.cadence_week)}/${bindingLabel(k.reflections.cadence_month)}/${bindingLabel(k.reflections.cadence_quarter)}/${bindingLabel(k.reflections.cadence_year)}] Cadence  [${bindingLabel(k.reflections.down)}/${bindingLabel(k.reflections.up)}] Move  [${bindingLabel(k.reflections.open_reflection)}] Write  [${bindingLabel(k.global.quit)}] Quit`,
  PROJECTS: (k) =>
    `[${bindingLabel(k.projects.down)}/${bindingLabel(k.projects.up)}] Move  [${bindingLabel(k.projects.new_project)}] New  [${bindingLabel(k.projects.edit_project_settings)}] Routine  [${bindingLabel(k.projects.edit_project_content)}] Edit  [${bindingLabel(k.projects.delete_project)}] Del  [${bindingLabel(k.global.quit)}] Quit`,
};

// @unit journals.views.status-bar
// @summary Show the status notification and per-view key hints
export function StatusBar() {
  const theme = useTheme();
  const icons = useIcons();
  const keymaps = useKeymaps();
  const { width } = useLayout();
  const { message } = useNotifications();
  const { filter, tab } = useNavigation();

  const leftMsg = filter ? `[Filter: "${filter}"] ${message}` : message;
  const hints = (TAB_HINTS[tab] ?? TAB_HINTS.TIMELINE)(keymaps);

  return (
    <box height={2} flexDirection="column">
      <text fg={theme.border}>{"─".repeat(width)}</text>
      <box flexDirection="row" justifyContent="space-between">
        <box flexDirection="row">
          <text fg={theme.primary}>{`${icons.pointer} `}</text>
          <text fg={theme.fg}>{leftMsg}</text>
        </box>
        <text fg={theme.muted}>{hints}</text>
      </box>
    </box>
  );
}
