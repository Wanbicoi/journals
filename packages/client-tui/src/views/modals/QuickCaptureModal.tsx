import { Modal, ModalFooter, ModalInput } from "../../components/Modal.js";
import { SuggestionList } from "../../components/SuggestionList.js";
import { useIcons } from "../../contexts/icons.js";
import { useKeymaps } from "../../contexts/keymaps.js";
import { useNotifications } from "../../contexts/notification.js";
import { useTheme } from "../../contexts/theme.js";
import { useEntryMutations } from "../../hooks/useEntryMutations.js";
import { bindingLabel } from "../../keymap.js";
import { useTextModalInput } from "./useTextModalInput.js";

// @unit journals.modals.quick-capture
// @summary Capture a one-line journal entry
export function QuickCaptureModal() {
  const theme = useTheme();
  const icons = useIcons();
  const keymaps = useKeymaps();
  const { notify } = useNotifications();
  const { quickCapture } = useEntryMutations();

  // @call journals.modals.text-input Handle the capture input, suggestions, and draft
  const { buffer, setBuffer, suggestions, activeSuggestionIdx, handleSubmit } = useTextModalInput({
    allowedSuggestions: ["project", "tag", "break", "date"],
    draftInEditor: true,
    // @call journals.hooks.capture Save the captured line
    submit: async (value) => {
      if (!value) return;
      await quickCapture(value);
      notify("Captured new journal entry!");
    },
  });

  const hasSuggestions = suggestions !== null && suggestions.matches.length > 0;
  const suggestionsLabel = suggestions?.type === "command" ? "Commands" : "Suggestions";

  return (
    <Modal maxWidth={100}>
      <ModalInput
        theme={theme}
        title={`${icons.quick} Quick capture`}
        borderColor={theme.primary}
        value={buffer}
        onChange={setBuffer}
        onSubmit={handleSubmit}
        placeholder="Note text /project:Name /tag:tag /date:today"
      />

      {hasSuggestions ? (
        <ModalFooter
          theme={theme}
          title={`${suggestionsLabel} (press ${bindingLabel(keymaps.modal.suggestion_accept)} to insert)`}
          borderColor={theme.accent}
          bottomTitle={`${activeSuggestionIdx + 1} of ${suggestions.matches.length}`}
        >
          <SuggestionList matches={suggestions.matches} activeIdx={activeSuggestionIdx} />
        </ModalFooter>
      ) : (
        <ModalFooter
          theme={theme}
          title="Tips"
          hints={[
            "Commands: /project:Name /tag:tag /break:3d /date:YYYY-MM-DD",
            'Quote names with spaces: /project:"My Project"',
            `[${bindingLabel(keymaps.modal.submit)}] Save   [${bindingLabel(keymaps.modal.cancel)}] Cancel   [Ctrl+${bindingLabel(keymaps.modal.draft_in_editor)}] Open $EDITOR`,
          ]}
        />
      )}
    </Modal>
  );
}
