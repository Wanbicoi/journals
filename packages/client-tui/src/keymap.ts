import type { Binding } from "@journals/core";

export interface KeyEventLike {
  name?: string;
  sequence?: string;
  ctrl?: boolean;
  shift?: boolean;
}

const PRINTABLE_SINGLE_CHAR = (sequence: string): boolean => {
  if (sequence.length !== 1) return false;
  const code = sequence.charCodeAt(0);
  return code > 0x1f && code !== 0x7f;
};

/**
 * One normalization for every binding: printable characters keep their case (so `G` is not `g`),
 * while control sequences fall back to the key name (`\r` is `return`, `\t` is `tab`).
 */
export function normalizeKey(key: KeyEventLike): string {
  const sequence = key.sequence;
  if (sequence && PRINTABLE_SINGLE_CHAR(sequence)) return sequence;
  return key.name ?? sequence ?? "";
}

function bindingsOf(binding: Binding): readonly string[] {
  return typeof binding === "string" ? [binding] : binding;
}

/**
 * A Ctrl chord is spelled `ctrl+n`. It also keeps matching an unmodified `n` binding, because
 * modifiers were once the handler's worry (`draft_in_editor: "e"` checks `key.ctrl`); a chord
 * binding wins when both are configured.
 */
function ctrlChord(normalized: string): string {
  return `ctrl+${normalized}`;
}

export function matchesBinding(key: KeyEventLike, binding: Binding): boolean {
  const normalized = normalizeKey(key);
  const values = bindingsOf(binding);
  return (
    values.includes(normalized) || (key.ctrl === true && values.includes(ctrlChord(normalized)))
  );
}

export function matchesAnyBinding(key: KeyEventLike, ...bindings: Binding[]): boolean {
  const normalized = normalizeKey(key);
  return bindings.some((binding) => {
    const values = bindingsOf(binding);
    return (
      values.includes(normalized) || (key.ctrl === true && values.includes(ctrlChord(normalized)))
    );
  });
}

/**
 * Resolve a key to the action it is bound to. Every action's keys come from the keymap config, so
 * a view never spells a letter or an arrow itself. Exact matches win over the Ctrl and Shift
 * fallbacks, so `ctrl+n` cannot be shadowed by `n`, and `G` (move to bottom) cannot be shadowed by
 * `g` (move to top).
 */
export function actionForKey<A extends string>(
  key: KeyEventLike,
  bindings: Partial<Record<A, Binding>>,
): A | null {
  const normalized = normalizeKey(key);
  const entries = Object.entries(bindings) as [A, Binding][];

  if (key.ctrl) {
    const chord = ctrlChord(normalized);
    for (const [action, binding] of entries) {
      if (bindingsOf(binding).includes(chord)) return action;
    }
  }

  for (const [action, binding] of entries) {
    if (bindingsOf(binding).includes(normalized)) return action;
  }

  if (key.shift) {
    for (const [action, binding] of entries) {
      const shifted = bindingsOf(binding).find(
        (value) =>
          value !== value.toLowerCase() && value.toLowerCase() === normalized.toLowerCase(),
      );
      if (shifted) return action;
    }
  }

  return null;
}

const KEY_LABELS: Record<string, string> = {
  escape: "Esc",
  return: "Enter",
  tab: "Tab",
  space: "Space",
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
};

const MODIFIER_LABELS: Record<string, string> = {
  ctrl: "Ctrl",
  shift: "Shift",
  meta: "Meta",
  alt: "Alt",
  super: "Super",
};

/** The key to print in a hint for an action that may accept several keys. */
export function bindingLabel(binding: Binding): string {
  const value = typeof binding === "string" ? binding : binding[0];
  const parts = value.split("+");
  const keyName = parts.pop() ?? value;
  const modifiers = parts.map((part) => MODIFIER_LABELS[part] ?? part);
  const keyLabel = KEY_LABELS[keyName] ?? keyName;
  // A chord reads as `Ctrl+N`; a lone letter keeps the case the user bound, as in `G`.
  const chordKey = modifiers.length > 0 && keyName.length === 1 ? keyLabel.toUpperCase() : keyLabel;
  return [...modifiers, chordKey].join("+");
}
