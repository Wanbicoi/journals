import { Modal } from "../../components/Modal.js";
import { useIcons } from "../../contexts/icons.js";
import { useNotifications } from "../../contexts/notification.js";
import { useTheme } from "../../contexts/theme.js";
import type { Entry } from "../../hooks/queries.js";
import { useEntryMutations } from "../../hooks/useEntryMutations.js";
import { useTextModalInput } from "./useTextModalInput.js";

interface EditProjectModalProps {
  entry: Entry;
}

// @unit journals.modals.reassign-entry
// @summary Move an entry to another project
export function EditProjectModal({ entry }: EditProjectModalProps) {
  const theme = useTheme();
  const icons = useIcons();
  const { notify } = useNotifications();
  const { updateEntryProject } = useEntryMutations();

  const { buffer, setBuffer, suggestions, activeSuggestionIdx, submitBuffer } = useTextModalInput({
    initialValue: `@${entry.projectName || ""}`,
    allowedSuggestions: ["project"],
    // @call journals.hooks.update-entry-project Reassign the entry
    submit: async (value) => {
      const target = value.replace(/^@/, "");
      if (!target) return;
      await updateEntryProject(entry.id, target);
      notify(`Note reassigned to @${target}`);
    },
  });

  return (
    <Modal theme={theme} borderColor={theme.primary}>
      <text fg={theme.primary}>{`${icons.project} REASSIGN PROJECT`}</text>
      <text fg={theme.muted}>{"Type @projectName [Tab for suggestion]"}</text>
      <box flexDirection="row">
        <text fg={theme.fg}>{"Project: "}</text>
        <input
          value={buffer}
          focused
          onChange={setBuffer}
          onInput={setBuffer}
          onSubmit={(value: unknown) =>
            void submitBuffer(typeof value === "string" ? value : buffer)
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
