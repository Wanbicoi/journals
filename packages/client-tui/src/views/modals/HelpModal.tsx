import { useKeyboard } from "@opentui/react";
import { Modal } from "../../components/Modal.js";
import { useKeymaps } from "../../contexts/keymaps.js";
import { useLayout } from "../../contexts/layout.js";
import { useModals } from "../../contexts/modals.js";
import { useTheme } from "../../contexts/theme.js";
import { useMouseClick } from "../../hooks/useMouseClick.js";
import { bindingLabel } from "../../keymap.js";

// @unit journals.modals.help
// @summary Show the keyboard shortcuts
// @details Reads the keymaps from context itself, so opening the help never depends on the
// | caller passing the right config through, and the listed keys cannot drift from the bindings.
export function HelpModal() {
  const theme = useTheme();
  const keymaps = useKeymaps();
  const { width } = useLayout();
  const { close } = useModals();
  const key = bindingLabel;

  useKeyboard(() => {
    close();
  });

  useMouseClick(({ type }) => {
    if (type === "down") close();
  });

  const groups = [
    {
      label: "VIEWS        ",
      text: `[${key(keymaps.global.view_dashboard)}] Dashboard  [${key(keymaps.global.view_timeline)}] Timeline  [${key(keymaps.global.view_reflections)}] Reflections  [${key(keymaps.global.view_projects)}] Projects`,
    },
    {
      label: "NAVIGATION   ",
      text: `[${key(keymaps.timeline.down)}/${key(keymaps.timeline.up)}] Move  [${key(keymaps.reflections.cadence_week)}/${key(keymaps.reflections.cadence_month)}/${key(keymaps.reflections.cadence_quarter)}/${key(keymaps.reflections.cadence_year)}] Cadence  [${key(keymaps.timeline.jump_today)}] Today  [${key(keymaps.timeline.prev_day)}/${key(keymaps.timeline.next_day)}] Day jumps`,
    },
    {
      label: "ACTIONS      ",
      text: `[${key(keymaps.timeline.quick_capture)}] Note  [${key(keymaps.timeline.edit_entry)}/${key(keymaps.reflections.open_reflection)}] Edit  [${key(keymaps.timeline.delete_entry)}] Delete  [${key(keymaps.timeline.undo)}] Undo  [${key(keymaps.dashboard.toggle_routine)}] Check`,
    },
    {
      label: "PROJECTS     ",
      text: `[${key(keymaps.timeline.edit_project)}] Reassign  [${key(keymaps.timeline.edit_tags)}] Tags  [${key(keymaps.projects.edit_project_settings)}] Routine settings  [${key(keymaps.projects.new_project)}] New project`,
    },
    {
      label: "GLOBAL       ",
      // Ctrl+C is deliberately absent from the keymap config: it is the fixed escape hatch,
      // dispatched before the scoped keymaps so it quits even while a modal is open.
      text: `[${key(keymaps.global.search_filter)}] Search/filter  [${key(keymaps.global.refresh)}] Refresh  [${key(keymaps.global.cancel)}] Back  [${key(keymaps.global.quit)}] Quit  [Ctrl+C] Quit anywhere`,
    },
    {
      label: "MODALS       ",
      text: `[${key(keymaps.modal.submit)}] Save  [${key(keymaps.modal.cancel)}] Cancel  [${key(keymaps.modal.confirm)}/${key(keymaps.modal.decline)}] Confirm/Decline  [${key(keymaps.modal.suggestion_accept)}] Suggest  [Ctrl+${key(keymaps.modal.draft_in_editor)}] Draft`,
    },
  ];

  return (
    <Modal theme={theme} borderColor={theme.primary} maxWidth={74}>
      <box flexDirection="row" justifyContent="space-between" marginBottom={1}>
        <text fg={theme.primary}>{"KEYBOARD SHORTCUTS"}</text>
        <text fg={theme.muted}>{`[${key(keymaps.global.cancel)} to close]`}</text>
      </box>
      <text fg={theme.border}>{"─".repeat(Math.min(70, width - 12))}</text>

      <box flexDirection="column" marginTop={1}>
        {groups.map((group) => (
          <box key={group.label} flexDirection="row">
            <text fg={theme.accent}>{group.label}</text>
            <text fg={theme.fg}>{group.text}</text>
          </box>
        ))}
      </box>

      <text fg={theme.muted} marginTop={1}>
        {"Press any key or click to dismiss"}
      </text>
    </Modal>
  );
}
