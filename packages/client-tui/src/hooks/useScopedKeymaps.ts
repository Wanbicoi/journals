import { useKeyboard } from "@opentui/react";
import { type Keymaps, useKeymaps } from "../contexts/keymaps.js";
import { useModals } from "../contexts/modals.js";
import { type KeyEventLike, actionForKey } from "../keymap.js";

type ScopeName = keyof Keymaps;

type ActionOf<S extends ScopeName> = keyof Keymaps[S];

type Handlers<S extends ScopeName> = Partial<
  Record<ActionOf<S>, (key: KeyEventLike) => void | Promise<void>>
>;

/**
 * Register the keymap for one scope. The actions and keys a scope owns are the ones under that
 * scope in the keymap config, and every view keymap is disabled while a modal owns the keyboard —
 * the gate lives here instead of an `isActive` prop threaded into each view.
 */

// @unit journals.hooks.scoped-keymaps
// @summary Dispatch a scope's keys while no modal is open
export function useScopedKeymaps<S extends ScopeName>(scope: S, handlers: Handlers<S>) {
  const keymaps = useKeymaps();
  const { isOpen } = useModals();

  // @call journals.contexts.modals Skip view keys while a modal is open
  useKeyboard(async (key) => {
    if (isOpen) return;

    const action = actionForKey(key, keymaps[scope]);
    if (!action) return;

    const handler = handlers[action as ActionOf<S>];
    if (handler) await handler(key);
  });
}
