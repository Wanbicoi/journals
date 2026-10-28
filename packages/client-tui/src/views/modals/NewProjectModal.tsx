import { Modal, ModalFooter, ModalInput } from "../../components/Modal.js";
import { SuggestionList } from "../../components/SuggestionList.js";
import { useIcons } from "../../contexts/icons.js";
import { useKeymaps } from "../../contexts/keymaps.js";
import { useNotifications } from "../../contexts/notification.js";
import { useTheme } from "../../contexts/theme.js";
import { parseProjectSpec } from "../../hooks/projectSpec.js";
import { useProjectMutations } from "../../hooks/useProjectMutations.js";
import { bindingLabel } from "../../keymap.js";
import { useTextModalInput } from "./useTextModalInput.js";

// @unit journals.modals.new-project
// @summary Create a project
export function NewProjectModal() {
  const theme = useTheme();
  const icons = useIcons();
  const keymaps = useKeymaps();
  const { notify } = useNotifications();
  const { createProject } = useProjectMutations();

  const { buffer, setBuffer, suggestions, activeSuggestionIdx, handleSubmit } = useTextModalInput({
    allowedSuggestions: ["recurrence", "policy"],
    // @call journals.hooks.create-project Create the project
    submit: async (value) => {
      const spec = parseProjectSpec(value, { strict: true });
      if (!spec.name) throw new Error("Project name is required");
      await createProject(spec.name, spec.recurrence ?? null, spec.missedPolicy ?? "spike");
      notify(`Created project @${spec.name}`);
    },
  });

  // @call journals.hooks.project-spec Preview the parsed name, cadence, and policy
  const spec = parseProjectSpec(buffer);
  const recurrencePreview = spec.recurrence !== undefined ? spec.recurrence : null;
  const hasSuggestions = suggestions !== null && suggestions.matches.length > 0;

  return (
    <Modal maxWidth={100}>
      <ModalInput
        theme={theme}
        title={`${icons.project} New project`}
        borderColor={theme.primary}
        value={buffer}
        onChange={setBuffer}
        onSubmit={handleSubmit}
        placeholder="Project name /recur:daily /policy:spike"
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
          bottomTitle={recurrencePreview ? `Recurrence: ${recurrencePreview}` : undefined}
          hints={[
            "Recurrence: /recur:every weekday or /recur:none",
            "Policy: /policy:spike | /policy:accumulate | /policy:mark_done",
            `[${bindingLabel(keymaps.modal.submit)}] Create   [${bindingLabel(keymaps.modal.cancel)}] Cancel`,
          ]}
        />
      )}
    </Modal>
  );
}
