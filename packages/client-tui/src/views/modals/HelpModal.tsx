import type { Config } from "@journals/core";
import { Modal } from "../../components/Modal.js";
import type { ThemePalette } from "../../theme.js";

interface HelpModalProps {
  width: number;
  height: number;
  keymaps: Config["keymaps"];
  theme: ThemePalette;
}

export function HelpModal({ width, height, keymaps, theme }: HelpModalProps) {
  const cancelKey = keymaps.cancel === "escape" ? "Esc" : keymaps.cancel;

  return (
    <Modal width={width} height={height} theme={theme} borderColor={theme.primary} maxWidth={74}>
      <box flexDirection="row" justifyContent="space-between" marginBottom={1}>
        <text fg={theme.primary}>{"KEYBOARD SHORTCUTS"}</text>
        <text fg={theme.muted}>{"[Esc to close]"}</text>
      </box>
      <text fg={theme.border}>{"─".repeat(Math.min(70, width - 12))}</text>

      <box flexDirection="column" marginTop={1}>
        <box flexDirection="row">
          <text fg={theme.accent}>{"VIEWS        "}</text>
          <text fg={theme.fg}>{"[1] Dashboard  [2] Timeline  [3] Reflections  [4] Projects"}</text>
        </box>
        <box flexDirection="row">
          <text fg={theme.accent}>{"NAVIGATION   "}</text>
          <text fg={theme.fg}>{"[j/k] Move  [w/m/q/y] Cadence  [t] Today  [[/]] Day jumps"}</text>
        </box>
        <box flexDirection="row">
          <text fg={theme.accent}>{"ACTIONS      "}</text>
          <text fg={theme.fg}>
            {"[n] Note  [e/Enter] Edit  [d] Delete  [u] Undo  [Space] Check"}
          </text>
        </box>
        <box flexDirection="row">
          <text fg={theme.accent}>{"PROJECTS     "}</text>
          <text fg={theme.fg}>
            {"[p] Reassign  [t] Tags  [P] Routine settings  [N] New project"}
          </text>
        </box>
        <box flexDirection="row">
          <text fg={theme.accent}>{"GLOBAL       "}</text>
          <text
            fg={theme.fg}
          >{`[/] Search/filter  [r] Refresh  [${cancelKey}] Back  [q] Quit`}</text>
        </box>
      </box>

      <text fg={theme.muted} marginTop={1}>
        {"Press any key or click to dismiss"}
      </text>
    </Modal>
  );
}
