import { Modal } from "../../components/Modal.js";
import type { ThemePalette } from "../../theme.js";

interface FilterModalProps {
  width: number;
  height: number;
  inputBuffer: string;
  tabTitle: string;
  theme: ThemePalette;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
}

export function FilterModal({
  width,
  height,
  inputBuffer,
  tabTitle,
  theme,
  onChange,
  onSubmit,
}: FilterModalProps) {
  return (
    <Modal width={width} height={height} theme={theme} borderColor={theme.accent}>
      <text bg={theme.accent} fg={theme.selectedFg}>{` / FILTER ${tabTitle.toUpperCase()} `}</text>
      <box flexDirection="row" marginTop={1}>
        <text fg={theme.fg}>{"Query: "}</text>
        <input
          value={inputBuffer}
          focused
          onChange={onChange}
          onInput={onChange}
          onSubmit={
            onSubmit ? (e: unknown) => onSubmit(typeof e === "string" ? e : inputBuffer) : undefined
          }
          placeholder="Search query..."
          textColor={theme.fg}
          focusedTextColor={theme.fg}
          placeholderColor={theme.muted}
        />
      </box>
      <text fg={theme.muted} marginTop={1}>
        {"[Enter: Apply] [Esc: Clear]"}
      </text>
    </Modal>
  );
}
