import { useKeyboard } from "@opentui/react";
import { useNotifications } from "../../contexts/notification.js";
import { editInEditor } from "../../editor.js";
import { matchesBinding } from "../../keymap.js";

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

  useKeyboard(async (key) => {
    if (!enabled || !key.ctrl || !matchesBinding(key, "e")) return;

    const saved = await editInEditor(buffer, async (content) => {
      setBuffer(content);
    });
    if (saved) notify("Drafted in external editor");
  });
}
