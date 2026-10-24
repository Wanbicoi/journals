import { Modal } from "../../components/Modal.js";
import type { SuggestionType } from "../../suggest.js";
import type { ThemePalette } from "../../theme.js";

interface EditProjectModalProps {
  width: number;
  height: number;
  inputBuffer: string;
  suggestions: { type: SuggestionType; matches: string[] } | null;
  activeSuggestionIdx: number;
  projectIcon: string;
  theme: ThemePalette;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
}

export function EditProjectModal({
  width,
  height,
  inputBuffer,
  suggestions,
  activeSuggestionIdx,
  projectIcon,
  theme,
  onChange,
  onSubmit,
}: EditProjectModalProps) {
  return (
    <Modal width={width} height={height} theme={theme} borderColor={theme.primary}>
      <text fg={theme.primary}>{`${projectIcon} REASSIGN PROJECT`}</text>
      <text fg={theme.muted}>{"Type @projectName [Tab for suggestion]"}</text>
      <box flexDirection="row">
        <text fg={theme.fg}>{"Project: "}</text>
        <input
          value={inputBuffer}
          focused
          onChange={onChange}
          onInput={onChange}
          onSubmit={
            onSubmit ? (e: unknown) => onSubmit(typeof e === "string" ? e : inputBuffer) : undefined
          }
          placeholder="@projectName"
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
              {`[@${m}] `}
            </text>
          ))}
        </box>
      )}

      <text fg={theme.muted} marginTop={1}>
        {"[Enter: Reassign] [Esc: Cancel]"}
      </text>
    </Modal>
  );
}
