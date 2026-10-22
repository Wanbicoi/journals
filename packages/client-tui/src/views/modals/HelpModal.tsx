import { Modal } from "../../components/Modal.js";
import type { ThemePalette } from "../../theme.js";

interface HelpModalProps {
  width: number;
  height: number;
  theme: ThemePalette;
}

export function HelpModal({ width, height, theme }: HelpModalProps) {
  return (
    <Modal width={width} height={height} theme={theme} borderColor={theme.primary} maxWidth={72}>
      <text bg={theme.primary} fg={theme.selectedFg}>
        {" KEYBOARD & MOUSE SHORTCUTS "}
      </text>
      <text fg={theme.border}>{"─".repeat(Math.min(68, width - 12))}</text>
      <text fg={theme.fg}>{"[1] or Click Header : Timeline Stream"}</text>
      <text fg={theme.fg}>{"[2] or Click Header : Projects & Markdown Preview"}</text>
      <text fg={theme.fg}>{"[j] / [k] or [Down]/[Up] : Navigate entries / projects"}</text>
      <text fg={theme.fg}>{"[n] : Quick capture note (@project #tags note)"}</text>
      <text fg={theme.fg}>{"[e] : Edit note (Timeline) or $EDITOR (Projects)"}</text>
      <text fg={theme.fg}>{"[d] : Delete selected note"}</text>
      <text fg={theme.fg}>{"[p] : Reassign note project"}</text>
      <text fg={theme.fg}>{"[t] : Edit note tags"}</text>
      <text fg={theme.fg}>{"[N] : Create new project"}</text>
      <text fg={theme.fg}>{"[/] : Filter / Search stream"}</text>
      <text fg={theme.fg}>{"[Esc] : Dismiss modal / Clear filter"}</text>
      <text fg={theme.fg}>{"[q] / [Ctrl+C] : Quit application"}</text>
      <text fg={theme.muted} marginTop={1}>
        {"Press any key or click to dismiss"}
      </text>
    </Modal>
  );
}
