import { useNotifications } from "../../contexts/notification.js";
import { editInEditor } from "../../editor.js";
import { useModalKeymaps } from "../../hooks/useModalKeymaps.js";

// @unit journals.modals.draft
// @summary Draft the modal buffer in $EDITOR
// @details Ctrl+E inside a text modal writes the buffer to $EDITOR and reads it back, so a long
// | note or reflection is not typed a line at a time.
export function useDraftInEditor(
  enabled: boolean,
  buffer: string,
  setBuffer: (value: string) => void,
) {
  const { notify } = useNotifications();

  // The binding names the letter; the modifier stays a code concern because `Binding` cannot
  // express one.
  useModalKeymaps({
    draft_in_editor: async (key) => {
      if (!enabled || !key.ctrl) return;

      const saved = await editInEditor(buffer, async (content) => {
        setBuffer(content);
      });
      if (saved) notify("Drafted in external editor");
    },
  });
}
