import { Modal } from "../../components/Modal.js";
import { useIcons } from "../../contexts/icons.js";
import { useNotifications } from "../../contexts/notification.js";
import { useTheme } from "../../contexts/theme.js";
import { useEntryMutations } from "../../hooks/useEntryMutations.js";
import { useTextModalInput } from "./useTextModalInput.js";

// @unit journals.modals.quick-capture
// @summary Capture a one-line journal entry
export function QuickCaptureModal() {
  const theme = useTheme();
  const icons = useIcons();
  const { notify } = useNotifications();
  const { quickCapture } = useEntryMutations();

  // @call journals.modals.text-input Handle the capture input, suggestions, and draft
  const { buffer, setBuffer, suggestions, activeSuggestionIdx, submitBuffer } = useTextModalInput({
    allowedSuggestions: ["project", "tag", "break"],
    draftInEditor: true,
    // @call journals.hooks.capture Save the captured line
    submit: async (value) => {
      if (!value) return;
      await quickCapture(value);
      notify("Captured new journal entry!");
    },
  });

  return (
    <Modal theme={theme} borderColor={theme.primary}>
      <text bg={theme.primary} fg={theme.selectedFg}>{` ${icons.quick} QUICK CAPTURE `}</text>
      <text fg={theme.muted}>
        {"Syntax: Note text @project #tags /date YYYY-MM-DD /yesterday /break 3d"}
      </text>
      <box flexDirection="row">
        <text fg={theme.accent}>{"> "}</text>
        <input
          value={buffer}
          focused
          onChange={setBuffer}
          onInput={setBuffer}
          onSubmit={(value: unknown) =>
            void submitBuffer(typeof value === "string" ? value : buffer)
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
