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

export function matchesBinding(key: KeyEventLike, binding: string): boolean {
  return normalizeKey(key) === binding;
}

export function matchesAnyBinding(key: KeyEventLike, ...bindings: string[]): boolean {
  const normalized = normalizeKey(key);
  return bindings.includes(normalized);
}
