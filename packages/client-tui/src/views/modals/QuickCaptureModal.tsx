import { Modal } from "../../components/Modal.js";
import type { SuggestionType } from "../../suggest.js";
import type { ThemePalette } from "../../theme.js";

interface QuickCaptureModalProps {
  width: number;
  height: number;
  inputBuffer: string;
  suggestions: { type: SuggestionType; matches: string[] } | null;
  activeSuggestionIdx: number;
  quickIcon: string;
  theme: ThemePalette;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
}

export function QuickCaptureModal({
  width,
  height,
  inputBuffer,
  suggestions,
  activeSuggestionIdx,
  quickIcon,
  theme,
  onChange,
  onSubmit,
}: QuickCaptureModalProps) {
  return (
    <Modal width={width} height={height} theme={theme} borderColor={theme.primary}>
      <text bg={theme.primary} fg={theme.selectedFg}>{` ${quickIcon} QUICK CAPTURE `}</text>
      <text fg={theme.muted}>
        {"Syntax: Note text @project #tags /date YYYY-MM-DD /yesterday /break 3d"}
      </text>
      <box flexDirection="row">
        <text fg={theme.accent}>{"> "}</text>
        <input
          value={inputBuffer}
          focused
          onChange={onChange}
          onInput={onChange}
          onSubmit={
            onSubmit ? (e: unknown) => onSubmit(typeof e === "string" ? e : inputBuffer) : undefined
          }
          placeholder="Note text @project #tags..."
          textColor={theme.fg}
          focusedTextColor={theme.fg}
          placeholderColor={theme.muted}
        />
      </box>

      {suggestions && suggestions.matches.length > 0 && (
        <box flexDirection="row" marginTop={1}>
          <text fg={theme.accent}>{"Suggestions: "}</text>
          {suggestions.matches.slice(0, 4).map((m, idx) => (
            <text
              key={m}
              fg={idx === activeSuggestionIdx ? theme.selectedFg : theme.muted}
              bg={idx === activeSuggestionIdx ? theme.primary : undefined}
            >
              {`[${suggestions.type === "project" ? "@" : suggestions.type === "tag" ? "#" : ""}${m}] `}
            </text>
          ))}
        </box>
      )}

      <text fg={theme.muted} marginTop={1}>
        {"[Enter: Save] [Ctrl+E: Open $EDITOR] [Tab: Suggest] [Esc: Cancel]"}
      </text>
    </Modal>
  );
}
