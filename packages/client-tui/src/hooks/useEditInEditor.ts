import { useCallback } from "react";
import { useNotifications } from "../contexts/notification.js";
import { editInEditor } from "../editor.js";

/**
 * Edit content in `$EDITOR` and notify only when the editor saved a change. Callers supply the
 * save action and the message, so the open/compare/save/notify workflow lives in one place.
 */
export function useEditInEditor() {
  const { notify } = useNotifications();

  return useCallback(
    async (
      initial: string,
      save: (content: string) => Promise<unknown>,
      successMessage: string,
    ) => {
      const saved = await editInEditor(initial, save);
      if (saved) notify(successMessage);
      return saved;
    },
    [notify],
  );
}
