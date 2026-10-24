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
    <Modal width={width} height={height} theme={theme} borderColor={theme.primary} maxWidth={72}>
      <text bg={theme.primary} fg={theme.selectedFg}>
        {" KEYBOARD & MOUSE SHORTCUTS "}
      </text>
      <text fg={theme.border}>{"─".repeat(Math.min(68, width - 12))}</text>
      <text
        fg={theme.fg}
      >{`[${keymaps.view_dashboard ?? "1"}] or Click Header : 60-Day Routine Dashboard`}</text>
      <text fg={theme.fg}>{`[${keymaps.view_timeline}] or Click Header : Timeline Stream`}</text>
      <text
        fg={theme.fg}
      >{`[${keymaps.view_reflections}] or Click Header : Periodic Reflections`}</text>
      <text
        fg={theme.fg}
      >{`[${keymaps.view_projects}] or Click Header : Projects & Markdown Preview`}</text>
      <text
        fg={theme.fg}
      >{`[${keymaps.down}] / [${keymaps.up}] or [Down]/[Up] : Navigate entries / periods / projects`}</text>
      <text fg={theme.fg}>
        {"[w] / [m] / [q] / [y] : Toggle Weekly/Monthly/Quarterly/Yearly (Reflections)"}
      </text>
      <text
        fg={theme.fg}
      >{`[${keymaps.quick_capture}] : Quick capture note (@project #tags note)`}</text>
      <text
        fg={theme.fg}
      >{`[${keymaps.edit_project_content}] / [Enter] : Edit note or $EDITOR (Reflection / Project)`}</text>
      <text fg={theme.fg}>{`[${keymaps.delete_entry}] : Delete selected note`}</text>
      <text fg={theme.fg}>{`[${keymaps.edit_project}] : Reassign note project`}</text>
      <text fg={theme.fg}>{`[${keymaps.edit_tags}] : Edit note tags`}</text>
      <text fg={theme.fg}>{`[${keymaps.new_project}] : Create new project`}</text>
      <text fg={theme.fg}>{`[${keymaps.search_filter}] : Filter / Search stream`}</text>
      <text fg={theme.fg}>{`[${keymaps.refresh}] : Refresh timeline & projects`}</text>
      <text fg={theme.fg}>{`[${cancelKey}] : Dismiss modal / Clear filter`}</text>
      <text fg={theme.fg}>{`[${keymaps.quit}] / [Ctrl+C] : Quit application`}</text>
      <text fg={theme.muted} marginTop={1}>
        {"Press any key or click to dismiss"}
      </text>
    </Modal>
  );
}
