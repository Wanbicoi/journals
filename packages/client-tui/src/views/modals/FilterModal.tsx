import React from "react";
import { Modal } from "../../components/Modal.js";
import type { ThemePalette } from "../../theme.js";

interface FilterModalProps {
  width: number;
  height: number;
  inputBuffer: string;
  theme: ThemePalette;
}

export function FilterModal({ width, height, inputBuffer, theme }: FilterModalProps) {
  return (
    <Modal width={width} height={height} theme={theme} borderColor={theme.accent}>
      <text fg={theme.accent}>{"/ FILTER & SEARCH"}</text>
      <text>{`Query: ${inputBuffer}█`}</text>
      <text fg={theme.muted}>{"[Enter: Apply] [Esc: Clear]"}</text>
    </Modal>
  );
}
