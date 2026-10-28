import { Modal } from "../../components/Modal.js";
import { useIcons } from "../../contexts/icons.js";
import { useNotifications } from "../../contexts/notification.js";
import { useTheme } from "../../contexts/theme.js";
import { parseProjectSpec } from "../../hooks/projectSpec.js";
import type { Project } from "../../hooks/queries.js";
import { useProjectMutations } from "../../hooks/useProjectMutations.js";
import { useTextModalInput } from "./useTextModalInput.js";

interface EditProjectSettingsModalProps {
  project: Project;
}

// @unit journals.modals.edit-project-settings
// @summary Edit a project's name, recurrence, and missed policy
export function EditProjectSettingsModal({ project }: EditProjectSettingsModalProps) {
  const theme = useTheme();
  const icons = useIcons();
  const { notify } = useNotifications();
  const { updateProject } = useProjectMutations();

  const recurStr = project.recurrence ? ` /recur ${project.recurrence}` : "";
  const policyStr = ` /policy:${project.missedPolicy || "spike"}`;

  const { buffer, setBuffer, handleSubmit } = useTextModalInput({
    initialValue: `${project.name}${recurStr}${policyStr}`,
    // @call journals.hooks.update-project Save the project settings
    submit: async (value) => {
      const spec = parseProjectSpec(value);
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

  return (
    <Modal theme={theme} borderColor={theme.primary}>
      <text
        fg={theme.primary}
      >{`${icons.project} EDIT PROJECT ROUTINE & SETTINGS: @${project.name}`}</text>
      <box flexDirection="row">
        <text fg={theme.fg}>{"Input: "}</text>
        <input
          value={buffer}
          focused
          onChange={setBuffer}
          onInput={setBuffer}
          onSubmit={handleSubmit}
          placeholder="/every cadence [/policy:accumulate|spike|mark_done]"
          textColor={theme.fg}
          focusedTextColor={theme.fg}
          placeholderColor={theme.muted}
        />
      </box>
      {recurrencePreview && (
        <text fg={theme.accent}>{`Detected Recurrence: ${recurrencePreview}`}</text>
      )}
      {spec.missedPolicy && (
        <text fg={theme.warning}>{`Detected Policy: ${spec.missedPolicy}`}</text>
      )}
      <text fg={theme.muted}>
        {"Recurrence: Add /every <cadence> (e.g. /every weekday, /recur daily, /recur:none)"}
      </text>
      <text fg={theme.muted}>
        {"Policy: Add /policy:accumulate | /policy:spike | /policy:mark_done"}
      </text>
      <text fg={theme.muted}>{"[Enter: Save Changes] [Esc: Cancel]"}</text>
    </Modal>
  );
}
