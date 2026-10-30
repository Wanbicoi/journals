import { Modal, ModalFooter, ModalPanel } from "../../components/Modal.js";
import { useIcons } from "../../contexts/icons.js";
import { useKeymaps } from "../../contexts/keymaps.js";
import { useModals } from "../../contexts/modals.js";
import { useNotifications } from "../../contexts/notification.js";
import { useTheme } from "../../contexts/theme.js";
import type { Project } from "../../hooks/queries.js";
import { useModalKeymaps } from "../../hooks/useModalKeymaps.js";
import { useProjectMutations } from "../../hooks/useProjectMutations.js";
import { bindingLabel } from "../../keymap.js";

interface DeleteProjectConfirmModalProps {
  project: Project;
}

// @unit journals.modals.delete-project
// @summary Confirm and soft-delete a project
// @details The project and its entries are only hidden. Recreating a project with the same
// | name revives the soft-deleted row, so its document and history come back intact.
export function DeleteProjectConfirmModal({ project }: DeleteProjectConfirmModalProps) {
  const theme = useTheme();
  const icons = useIcons();
  const keymaps = useKeymaps();
  const { close } = useModals();
  const { notify } = useNotifications();
  // @call journals.hooks.delete-project Soft-delete the opened project
  const { deleteProject } = useProjectMutations();

  useModalKeymaps({
    submit: async () => {
      try {
        await deleteProject(project.id);
        notify(`Deleted project @${project.name}. Recreate it with the same name to restore.`);
      } catch (error) {
        notify(`Delete failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      close();
    },
    cancel: () => {
      notify("Delete cancelled");
      close();
    },
  });

  return (
    <Modal maxWidth={72}>
      <ModalPanel
        theme={theme}
        title={`${icons.warning} Delete project`}
        borderColor={theme.highlight}
      >
        <text fg={theme.fg}>{"Are you sure you want to delete:"}</text>
        <text fg={theme.muted}>{`@${project.name}`}</text>
        <text fg={theme.muted}>
          {"Its notes are hidden with it. Recreate the project with the same name to restore."}
        </text>
      </ModalPanel>
      <ModalFooter
        theme={theme}
        title="Confirm"
        borderColor={theme.highlight}
        hints={[
          `[${bindingLabel(keymaps.modal.submit)}] Delete   [${bindingLabel(keymaps.modal.cancel)}] Cancel`,
        ]}
      />
    </Modal>
  );
}
