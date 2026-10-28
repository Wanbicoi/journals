import { Modal } from "../../components/Modal.js";
import { useIcons } from "../../contexts/icons.js";
import { useModals } from "../../contexts/modals.js";
import { useNotifications } from "../../contexts/notification.js";
import { useTheme } from "../../contexts/theme.js";
import { useUndo } from "../../contexts/undo.js";
import type { Entry } from "../../hooks/queries.js";
import { useEntryMutations } from "../../hooks/useEntryMutations.js";
import { useModalKeymaps } from "../../hooks/useModalKeymaps.js";

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
  const { close } = useModals();
  const { notify } = useNotifications();
  // @call journals.contexts.undo Remember the deleted entry for undo
  const { rememberDeleted } = useUndo();
  // @call journals.hooks.delete-entry Soft-delete the opened entry
  const { deleteEntry } = useEntryMutations();

  useModalKeymaps({
    confirm: async () => {
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
    decline: () => {
      notify("Delete cancelled");
      close();
    },
  });

  return (
    <Modal theme={theme} borderColor={theme.highlight} maxWidth={64}>
      <text bg={theme.highlight} fg={theme.selectedFg}>
        {` ${icons.warning} DELETE NOTE `}
      </text>
      <text fg={theme.fg} marginTop={1}>
        {"Are you sure you want to delete:"}
      </text>
      <text fg={theme.muted}>{`"${entry.content.slice(0, 48)}..."`}</text>
      <box marginTop={1} flexDirection="row">
        <text fg={theme.highlight}>{"[y: Confirm Delete]"}</text>
        <text> </text>
        <text fg={theme.muted}>{"[n / Esc: Cancel]"}</text>
      </box>
    </Modal>
  );
}
