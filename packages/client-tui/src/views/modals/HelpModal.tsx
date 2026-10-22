import React from "react";
import { Modal } from "../../components/Modal.js";
import type { ThemePalette } from "../../theme.js";

interface HelpModalProps {
  width: number;
  height: number;
  theme: ThemePalette;
}

export function HelpModal({ width, height, theme }: HelpModalProps) {
  return (
    <Modal width={width} height={height} theme={theme} borderColor={theme.primary} maxWidth={76}>
      <text fg={theme.primary}>{"? KEYBOARD SHORTCUTS & HELP"}</text>
      <text fg={theme.fg}>{"[1] Switch to Daily Timeline Stream View"}</text>
      <text fg={theme.fg}>{"[2] Switch to Projects & Markdown Preview View"}</text>
      <text fg={theme.fg}>{"[j / k] Navigate entries / projects"}</text>
      <text fg={theme.fg}>{"[n] 1-Line Quick Capture (Syntax: text @proj #tag)"}</text>
      <text fg={theme.fg}>{"[N] Create new project"}</text>
      <text fg={theme.fg}>{"[p] Reassign project for selected note"}</text>
      <text fg={theme.fg}>{"[t] Edit tags for selected note"}</text>
      <text fg={theme.fg}>{"[e] Edit project markdown content in $EDITOR"}</text>
      <text fg={theme.fg}>{"[/] Search / filter stream or projects"}</text>
      <text fg={theme.fg}>{"[Tab] Accept suggestions when typing"}</text>
      <text fg={theme.fg}>{"[Ctrl+W] Delete word | [Ctrl+U] Clear line"}</text>
      <text fg={theme.fg}>{"[Esc] Cancel prompt / Clear filter"}</text>
      <text fg={theme.fg}>{"[q] Quit application"}</text>
      <text fg={theme.muted} marginTop={1}>
        {"Press any key or Esc to dismiss"}
      </text>
    </Modal>
  );
}
