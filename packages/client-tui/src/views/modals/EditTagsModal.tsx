import { Modal } from "../../components/Modal.js";
import { SuggestionList } from "../../components/SuggestionList.js";
import { useIcons } from "../../contexts/icons.js";
import { useNotifications } from "../../contexts/notification.js";
import { useTheme } from "../../contexts/theme.js";
import type { Entry } from "../../hooks/queries.js";
import { useEntryMutations } from "../../hooks/useEntryMutations.js";
import { useTextModalInput } from "./useTextModalInput.js";

interface EditTagsModalProps {
  entry: Entry;
}

/** Comma- or `#`-separated input, normalized to the tag alphabet the server accepts. */
function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((tag) => tag.trim().toLowerCase().replace(/^#/, ""))
    .filter((tag) => /^[a-z0-9-_]+$/.test(tag));
}

// @unit journals.modals.edit-tags
// @summary Replace an entry's tags
export function EditTagsModal({ entry }: EditTagsModalProps) {
  const theme = useTheme();
  const icons = useIcons();
  const { notify } = useNotifications();
  const { updateEntryTags } = useEntryMutations();

  const { buffer, setBuffer, suggestions, activeSuggestionIdx, handleSubmit } = useTextModalInput({
    initialValue: entry.tags.join(", "),
    allowedSuggestions: ["tag"],
    // @call journals.hooks.update-entry-tags Replace the entry's tags
    submit: async (value) => {
      await updateEntryTags(entry.id, parseTags(value));
      notify("Updated note tags!");
    },
  });

  return (
    <Modal theme={theme} borderColor={theme.tag}>
      <text fg={theme.tag}>{`${icons.tag} EDIT NOTE TAGS`}</text>
      <text fg={theme.muted}>{"Comma-separated tags, #tag [Tab for suggestion]"}</text>
      <box flexDirection="row">
        <text fg={theme.fg}>{"Tags: "}</text>
        <input
          value={buffer}
          focused
          onChange={setBuffer}
          onInput={setBuffer}
          onSubmit={handleSubmit}
          placeholder="tag1, tag2, #tag3"
          textColor={theme.fg}
          focusedTextColor={theme.fg}
          placeholderColor={theme.muted}
        />
      </box>

      {suggestions && suggestions.matches.length > 0 && (
        <SuggestionList matches={suggestions.matches} activeIdx={activeSuggestionIdx} prefix="#" />
      )}

      <text fg={theme.muted} marginTop={1}>
        {"[Enter: Save] [Esc: Cancel]"}
      </text>
    </Modal>
  );
}
