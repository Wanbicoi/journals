import { Modal } from "../../components/Modal.js";
import type { SuggestionType } from "../../suggest.js";
import type { ThemePalette } from "../../theme.js";

interface EditTagsModalProps {
  width: number;
  height: number;
  inputBuffer: string;
  suggestions: { type: SuggestionType; matches: string[] } | null;
  activeSuggestionIdx: number;
  tagIcon: string;
  theme: ThemePalette;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
}

export function EditTagsModal({
  width,
  height,
  inputBuffer,
  suggestions,
  activeSuggestionIdx,
  tagIcon,
  theme,
  onChange,
  onSubmit,
}: EditTagsModalProps) {
  return (
    <Modal width={width} height={height} theme={theme} borderColor={theme.tag}>
      <text fg={theme.tag}>{`${tagIcon} EDIT NOTE TAGS`}</text>
      <text fg={theme.muted}>{"Comma-separated tags, #tag [Tab for suggestion]"}</text>
      <box flexDirection="row">
        <text fg={theme.fg}>{"Tags: "}</text>
        <input
          value={inputBuffer}
          focused
          onChange={onChange}
          onInput={onChange}
          onSubmit={
            onSubmit ? (e: unknown) => onSubmit(typeof e === "string" ? e : inputBuffer) : undefined
          }
          placeholder="tag1, tag2, #tag3"
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
              {`[#${m}] `}
            </text>
          ))}
        </box>
      )}

      <text fg={theme.muted} marginTop={1}>
        {"[Enter: Save] [Esc: Cancel]"}
      </text>
    </Modal>
  );
}
