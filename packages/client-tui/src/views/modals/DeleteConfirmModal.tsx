import { Modal, ModalFooter, ModalPanel } from "../../components/Modal.js";
import { useIcons } from "../../contexts/icons.js";
import { useKeymaps } from "../../contexts/keymaps.js";
import { useModals } from "../../contexts/modals.js";
import { useNotifications } from "../../contexts/notification.js";
import { useTheme } from "../../contexts/theme.js";
import { useUndo } from "../../contexts/undo.js";
import type { Entry } from "../../hooks/queries.js";
import { useEntryMutations } from "../../hooks/useEntryMutations.js";
import { useModalKeymaps } from "../../hooks/useModalKeymaps.js";
import { bindingLabel } from "../../keymap.js";

interface DeleteConfirmModalProps {
  entry: Entry;
}

// @unit journals.modals.delete-entry
// @summary Confirm and soft-delete an entry
// @details Remembers the deleted entry with the undo history, so `u` in the timeline can restore
// | exactly the row the user just confirmed.
export function DeleteConfirmModal({ entry }: DeleteConfirmModalProps) {
  const theme = useTheme();
  const icons = useIcons();
  const keymaps = useKeymaps();
  const { close } = useModals();
  const { notify } = useNotifications();
  // @call journals.contexts.undo Remember the deleted entry for undo
  const { rememberDeleted } = useUndo();
  // @call journals.hooks.delete-entry Soft-delete the opened entry
  const { deleteEntry } = useEntryMutations();

  useModalKeymaps({
    submit: async () => {
      rememberDeleted(entry);
      try {
        await deleteEntry(entry.id);
        notify("Deleted entry. Press 'u' to undo.");
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
    <Modal maxWidth={64}>
      <ModalPanel
        theme={theme}
        title={`${icons.warning} Delete note`}
        borderColor={theme.highlight}
      >
        <text fg={theme.fg}>{"Are you sure you want to delete:"}</text>
        <text fg={theme.muted}>{`"${entry.content.slice(0, 48)}..."`}</text>
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
