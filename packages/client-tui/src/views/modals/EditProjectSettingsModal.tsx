import { Modal, ModalFooter, ModalInput } from "../../components/Modal.js";
import { SuggestionList } from "../../components/SuggestionList.js";
import { useIcons } from "../../contexts/icons.js";
import { useKeymaps } from "../../contexts/keymaps.js";
import { useNotifications } from "../../contexts/notification.js";
import { useTheme } from "../../contexts/theme.js";
import { parseProjectSpec } from "../../hooks/projectSpec.js";
import type { Project } from "../../hooks/queries.js";
import { useProjectMutations } from "../../hooks/useProjectMutations.js";
import { bindingLabel } from "../../keymap.js";
import { useTextModalInput } from "./useTextModalInput.js";

interface EditProjectSettingsModalProps {
  project: Project;
}

// @unit journals.modals.edit-project-settings
// @summary Edit a project's name, recurrence, and missed policy
export function EditProjectSettingsModal({ project }: EditProjectSettingsModalProps) {
  const theme = useTheme();
  const icons = useIcons();
  const keymaps = useKeymaps();
  const { notify } = useNotifications();
  const { updateProject } = useProjectMutations();

  const recurStr = project.recurrence ? ` /recur:${project.recurrence}` : "";
  const policyStr = ` /policy:${project.missedPolicy || "spike"}`;

  const { buffer, setBuffer, suggestions, activeSuggestionIdx, handleSubmit } = useTextModalInput({
    initialValue: `${project.name}${recurStr}${policyStr}`,
    allowedSuggestions: ["recurrence", "policy"],
    // @call journals.hooks.update-project Save the project settings
    submit: async (value) => {
      const spec = parseProjectSpec(value, { strict: true });
      await updateProject(project.id, {
        name: spec.name || project.name,
        recurrence: spec.recurrence,
        missedPolicy: spec.missedPolicy,
      });
      notify(`Updated settings for @${spec.name || project.name}`);
    },
  });

  // @call journals.hooks.project-spec Preview the parsed name, cadence, and policy
  const spec = parseProjectSpec(buffer);
  const recurrencePreview =
    spec.recurrence === undefined
      ? null
      : spec.recurrence === null
        ? "None (Remove Routine)"
        : spec.recurrence;

  const hasSuggestions = suggestions !== null && suggestions.matches.length > 0;

  return (
    <Modal maxWidth={100}>
      <ModalInput
        theme={theme}
        title={`${icons.project} Edit project @${project.name}`}
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
          borderColor={theme.border}
          bottomTitle={spec.missedPolicy ? `Policy: ${spec.missedPolicy}` : undefined}
          hints={[
            recurrencePreview
              ? `Detected recurrence: ${recurrencePreview}`
              : "Recurrence: /recur:every weekday or /recur:none",
            "Policy: /policy:accumulate | /policy:spike | /policy:mark_done",
            `[${bindingLabel(keymaps.modal.submit)}] Save changes   [${bindingLabel(keymaps.modal.cancel)}] Cancel`,
          ]}
        />
      )}
    </Modal>
  );
}
