import { Modal } from "../../components/Modal.js";
import { useIcons } from "../../contexts/icons.js";
import { useNotifications } from "../../contexts/notification.js";
import { useTheme } from "../../contexts/theme.js";
import { parseProjectSpec } from "../../hooks/projectSpec.js";
import { useProjectMutations } from "../../hooks/useProjectMutations.js";
import { useTextModalInput } from "./useTextModalInput.js";

// @unit journals.modals.new-project
// @summary Create a project
export function NewProjectModal() {
  const theme = useTheme();
  const icons = useIcons();
  const { notify } = useNotifications();
  const { createProject } = useProjectMutations();

  const { buffer, setBuffer, submitBuffer } = useTextModalInput({
    // @call journals.hooks.create-project Create the project
    submit: async (value) => {
      const spec = parseProjectSpec(value);
      if (!spec.name) return;
      await createProject(spec.name, spec.recurrence ?? null, spec.missedPolicy ?? "spike");
      notify(`Created project @${spec.name}`);
    },
  });

  // @call journals.hooks.project-spec Preview the parsed name, cadence, and policy
  const spec = parseProjectSpec(buffer);
  const recurrencePreview = spec.recurrence !== undefined ? spec.recurrence : null;

  return (
    <Modal theme={theme} borderColor={theme.primary}>
      <text fg={theme.primary}>{`${icons.project} CREATE NEW PROJECT`}</text>
      <box flexDirection="row">
        <text fg={theme.fg}>{"Input: "}</text>
        <input
          value={buffer}
          focused
          onChange={setBuffer}
          onInput={setBuffer}
          onSubmit={(value: unknown) =>
            void submitBuffer(typeof value === "string" ? value : buffer)
          }
          placeholder="Project name [/every cadence] [/policy:...]"
          textColor={theme.fg}
          focusedTextColor={theme.fg}
          placeholderColor={theme.muted}
        />
      </box>
      {recurrencePreview && <text fg={theme.accent}>{`Detected RRULE: ${recurrencePreview}`}</text>}
      <text fg={theme.muted}>
        {"Optional: Add /recur <interval> (e.g. /recur daily, /every 3 days)"}
      </text>
      <text fg={theme.muted}>
        {"Optional: Add /policy:accumulate or /policy:spike (default: spike)"}
      </text>
      <text fg={theme.muted}>{"[Enter: Create] [Esc: Cancel]"}</text>
    </Modal>
  );
}
