import React from "react";
import { Modal } from "../../components/Modal.js";
import type { ThemePalette } from "../../theme.js";

interface EditContentModalProps {
  width: number;
  height: number;
  inputBuffer: string;
  theme: ThemePalette;
}

export function EditContentModal({ width, height, inputBuffer, theme }: EditContentModalProps) {
  return (
    <Modal width={width} height={height} theme={theme} borderColor={theme.primary}>
      <text bg={theme.primary} fg={theme.selectedFg}>
        {" EDIT NOTE CONTENT "}
      </text>
      <text fg={theme.muted}>{"Modify note text or press Esc to cancel:"}</text>
      <box marginTop={1}>
        <text fg={theme.primary}>{"> "}</text>
        <text fg={theme.fg}>{inputBuffer}</text>
        <text fg={theme.accent}>{"█"}</text>
      </box>
      <box marginTop={1} flexDirection="row">
        <text fg={theme.accent}>{"[Enter: Save]"}</text>
        <text> </text>
        <text fg={theme.muted}>{"[Esc: Cancel]"}</text>
      </box>
    </Modal>
  );
}
