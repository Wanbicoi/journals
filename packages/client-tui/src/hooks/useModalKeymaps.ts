import { useKeyboard } from "@opentui/react";
import { type Keymaps, useKeymaps } from "../contexts/keymaps.js";
import { type KeyEventLike, actionForKey } from "../keymap.js";

type ModalAction = keyof Keymaps["modal"];
type ModalHandlers = Partial<Record<ModalAction, (key: KeyEventLike) => void | Promise<void>>>;

/**
 * Register the keys a modal answers. Modal components only mount while the modal is open, so this
 * needs no `isOpen` gate: being mounted already means the modal owns the keyboard.
 */
export function useModalKeymaps(handlers: ModalHandlers) {
  const keymaps = useKeymaps();
  useKeyboard(async (key) => {
    const action = actionForKey(key, keymaps.modal);
    if (action) await handlers[action]?.(key);
  });
}
