import { Modal } from "../../components/Modal.js";
import { useNavigation } from "../../contexts/navigation.js";
import { useNotifications } from "../../contexts/notification.js";
import { useTheme } from "../../contexts/theme.js";
import { useTextModalInput } from "./useTextModalInput.js";

// @unit journals.modals.filter
// @summary Search the active view
export function FilterModal() {
  const theme = useTheme();
  const { tab, filter, setFilter, clearFilter } = useNavigation();
  const { notify } = useNotifications();

  const { buffer, setBuffer, submitBuffer } = useTextModalInput({
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
    <Modal theme={theme} borderColor={theme.accent}>
      <text bg={theme.accent} fg={theme.selectedFg}>{` / FILTER ${tab.toUpperCase()} `}</text>
      <box flexDirection="row" marginTop={1}>
        <text fg={theme.fg}>{"Query: "}</text>
        <input
          value={buffer}
          focused
          onChange={setBuffer}
          onInput={setBuffer}
          onSubmit={(value: unknown) =>
            void submitBuffer(typeof value === "string" ? value : buffer)
          }
          placeholder="Search query..."
          textColor={theme.fg}
          focusedTextColor={theme.fg}
          placeholderColor={theme.muted}
        />
      </box>
      <text fg={theme.muted} marginTop={1}>
        {"[Enter: Apply] [Esc: Clear]"}
      </text>
    </Modal>
  );
}
