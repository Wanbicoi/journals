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

interface EditProjectModalProps {
  entry: Entry;
}

// @unit journals.modals.reassign-entry
// @summary Move an entry to another project
export function EditProjectModal({ entry }: EditProjectModalProps) {
  const theme = useTheme();
  const icons = useIcons();
  const keymaps = useKeymaps();
  const { notify } = useNotifications();
  const { updateEntryProject } = useEntryMutations();

  const { buffer, setBuffer, suggestions, activeSuggestionIdx, handleSubmit } = useTextModalInput({
    initialValue: entry.projectName || "",
    allowedSuggestions: ["project"],
    suggestionMode: "plain",
    // @call journals.hooks.update-entry-project Reassign the entry
    submit: async (value) => {
      const target = value.trim();
      if (!target) return;
      await updateEntryProject(entry.id, target);
      notify(`Note reassigned to @${target}`);
    },
  });

  const hasSuggestions = suggestions !== null && suggestions.matches.length > 0;

  return (
    <Modal maxWidth={100}>
      <ModalInput
        theme={theme}
        title={`${icons.project} Reassign project`}
        borderColor={theme.primary}
        value={buffer}
        onChange={setBuffer}
        onSubmit={handleSubmit}
        placeholder="Project name"
      />

      {hasSuggestions ? (
        <ModalFooter
          theme={theme}
          title={`Suggestions (press ${bindingLabel(keymaps.modal.suggestion_accept)} to insert)`}
          borderColor={theme.primary}
          bottomTitle={`${activeSuggestionIdx + 1} of ${suggestions.matches.length}`}
        >
          <SuggestionList matches={suggestions.matches} activeIdx={activeSuggestionIdx} />
        </ModalFooter>
      ) : (
        <ModalFooter
          theme={theme}
          title="Tips"
          hints={[
            "Type a project name, e.g. Reading",
            `[${bindingLabel(keymaps.modal.submit)}] Reassign   [${bindingLabel(keymaps.modal.cancel)}] Cancel   [${bindingLabel(keymaps.modal.suggestion_accept)}] Suggest`,
          ]}
        />
      )}
    </Modal>
  );
}
