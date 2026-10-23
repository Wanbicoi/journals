import { Modal } from "../../components/Modal.js";
import type { ThemePalette } from "../../theme.js";

interface FilterModalProps {
  width: number;
  height: number;
  inputBuffer: string;
  tabTitle: string;
  theme: ThemePalette;
}

export function FilterModal({ width, height, inputBuffer, tabTitle, theme }: FilterModalProps) {
  return (
    <Modal width={width} height={height} theme={theme} borderColor={theme.accent}>
      <text bg={theme.accent} fg={theme.selectedFg}>{` / FILTER ${tabTitle.toUpperCase()} `}</text>
      <text fg={theme.fg} marginTop={1}>{`Query: ${inputBuffer}█`}</text>
      <text fg={theme.muted} marginTop={1}>
        {"[Enter: Apply] [Esc: Clear]"}
      </text>
    </Modal>
  );
}
