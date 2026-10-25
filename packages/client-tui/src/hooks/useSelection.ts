import { useCallback, useState } from "react";

export interface Identifiable {
  id: string;
}

/**
 * Resolve a selected id to an index in the current list. A missing id falls back to the first
 * selectable row instead of leaking `undefined` into the view.
 */
export function resolveSelectedIndex<T extends Identifiable>(
  items: T[],
  selectedId: string | null,
): number {
  if (items.length === 0) return -1;
  if (selectedId === null) return 0;
  const index = items.findIndex((item) => item.id === selectedId);
  return index === -1 ? 0 : index;
}

export interface SelectionById<T extends Identifiable> {
  selectedId: string | null;
  selectedIndex: number;
  selected: T | undefined;
  selectIndex: (index: number) => void;
  select: (item: T | undefined) => void;
  clear: () => void;
}

/**
 * Selection stored as an id, derived against the list every render. Indices survive filters,
 * deletes, and refetches only as a derived value, never as state.
 */
export function useSelectionById<T extends Identifiable>(items: T[]): SelectionById<T> {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedIndex = resolveSelectedIndex(items, selectedId);
  const selected = selectedIndex === -1 ? undefined : items[selectedIndex];

  const selectIndex = useCallback(
    (index: number) => {
      setSelectedId(items[index]?.id ?? null);
    },
    [items],
  );

  const select = useCallback((item: T | undefined) => {
    setSelectedId(item?.id ?? null);
  }, []);

  const clear = useCallback(() => {
    setSelectedId(null);
  }, []);

  return { selectedId, selectedIndex, selected, selectIndex, select, clear };
}
