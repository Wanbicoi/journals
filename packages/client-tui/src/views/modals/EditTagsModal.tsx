import { Modal, ModalFooter, ModalInput } from "../../components/Modal.js";
import { SuggestionList } from "../../components/SuggestionList.js";
import { useIcons } from "../../contexts/icons.js";
import { useKeymaps } from "../../contexts/keymaps.js";
import { useNotifications } from "../../contexts/notification.js";
import { useTheme } from "../../contexts/theme.js";
import type { Entry } from "../../hooks/queries.js";
import { useEntryMutations } from "../../hooks/useEntryMutations.js";
import { bindingLabel } from "../../keymap.js";
import { useTextModalInput } from "./useTextModalInput.js";

interface EditTagsModalProps {
  entry: Entry;
}

/** Comma-separated input, normalized to the tag alphabet the server accepts. */
function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag.length <= 50 && /^[a-z0-9-_]+$/.test(tag));
}

// @unit journals.modals.edit-tags
// @summary Replace an entry's tags
export function EditTagsModal({ entry }: EditTagsModalProps) {
  const theme = useTheme();
  const icons = useIcons();
  const keymaps = useKeymaps();
  const { notify } = useNotifications();
  const { updateEntryTags } = useEntryMutations();

  const { buffer, setBuffer, suggestions, activeSuggestionIdx, handleSubmit } = useTextModalInput({
    initialValue: entry.tags.join(", "),
    allowedSuggestions: ["tag"],
    suggestionMode: "plain",
    // @call journals.hooks.update-entry-tags Replace the entry's tags
    submit: async (value) => {
      await updateEntryTags(entry.id, parseTags(value));
      notify("Updated note tags!");
    },
  });

  const hasSuggestions = suggestions !== null && suggestions.matches.length > 0;

  return (
    <Modal maxWidth={100}>
      <ModalInput
        theme={theme}
        title={`${icons.tag} Edit tags`}
        borderColor={theme.tag}
        value={buffer}
        onChange={setBuffer}
        onSubmit={handleSubmit}
        placeholder="work, reading"
      />

      {hasSuggestions ? (
        <ModalFooter
          theme={theme}
          title={`Suggestions (press ${bindingLabel(keymaps.modal.suggestion_accept)} to insert)`}
          borderColor={theme.tag}
          bottomTitle={`${activeSuggestionIdx + 1} of ${suggestions.matches.length}`}
        >
          <SuggestionList matches={suggestions.matches} activeIdx={activeSuggestionIdx} />
        </ModalFooter>
      ) : (
        <ModalFooter
          theme={theme}
          title="Tips"
          hints={[
            "Comma-separated tags, e.g. work, reading",
            `[${bindingLabel(keymaps.modal.submit)}] Save   [${bindingLabel(keymaps.modal.cancel)}] Cancel   [${bindingLabel(keymaps.modal.suggestion_accept)}] Suggest`,
          ]}
        />
      )}
    </Modal>
  );
}
