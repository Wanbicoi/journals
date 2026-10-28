import { Modal, ModalFooter, ModalInput } from "../../components/Modal.js";
import { useKeymaps } from "../../contexts/keymaps.js";
import { useNavigation } from "../../contexts/navigation.js";
import { useNotifications } from "../../contexts/notification.js";
import { useTheme } from "../../contexts/theme.js";
import { bindingLabel } from "../../keymap.js";
import { useTextModalInput } from "./useTextModalInput.js";

// @unit journals.modals.filter
// @summary Search the active view
export function FilterModal() {
  const theme = useTheme();
  const keymaps = useKeymaps();
  const { tab, filter, setFilter, clearFilter } = useNavigation();
  const { notify } = useNotifications();

  const { buffer, setBuffer, handleSubmit } = useTextModalInput({
    initialValue: filter,
    // @call journals.contexts.navigation Save the search filter
    submit: (value) => {
      setFilter(value);
      notify(value ? `Filter: "${value}"` : "Filter cleared");
    },
    onCancel: () => {
      if (clearFilter()) notify("Filter cleared");
    },
  });

  return (
    <Modal maxWidth={72}>
      <ModalInput
        theme={theme}
        title={`Filter ${tab.toLowerCase()}`}
        borderColor={theme.accent}
        value={buffer}
        onChange={setBuffer}
        onSubmit={handleSubmit}
        placeholder="Search query..."
      />
      <ModalFooter
        theme={theme}
        title="Tips"
        hints={[
          `[${bindingLabel(keymaps.modal.submit)}] Apply filter   [${bindingLabel(keymaps.modal.cancel)}] Cancel and clear`,
        ]}
      />
    </Modal>
  );
}
