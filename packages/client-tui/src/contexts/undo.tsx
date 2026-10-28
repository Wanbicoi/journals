import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Entry } from "../hooks/queries.js";
import { useEntryMutations } from "../hooks/useEntryMutations.js";
import { useNotifications } from "./notification.js";

export interface UndoValue {
  /** Remember an entry just deleted so `u` can restore it. */
  rememberDeleted: (entry: Entry) => void;
  /** Restore the remembered entry, reporting the outcome. */
  undo: () => Promise<void>;
}

const UndoContext = createContext<UndoValue | null>(null);

interface UndoProviderProps {
  children: ReactNode;
}

// @unit journals.contexts.undo
// @summary Keep the one-slot undo history
// @details The delete modal remembers the entry, the timeline's `u` key restores it through the
// | entry mutations. The two screens are apart, so the history lives above them.
export function UndoProvider({ children }: UndoProviderProps) {
  const [lastDeletedEntry, setLastDeletedEntry] = useState<Entry | null>(null);
  const { restoreEntry } = useEntryMutations();
  const { notify } = useNotifications();

  const rememberDeleted = useCallback((entry: Entry) => {
    setLastDeletedEntry(entry);
  }, []);

  const undo = useCallback(async () => {
    if (!lastDeletedEntry) {
      notify("No recently deleted entry to undo");
      return;
    }

    await restoreEntry(lastDeletedEntry.id);
    notify(`Restored entry "${lastDeletedEntry.content.slice(0, 30)}..."`);
    setLastDeletedEntry(null);
  }, [lastDeletedEntry, notify, restoreEntry]);

  const value = useMemo<UndoValue>(() => ({ rememberDeleted, undo }), [rememberDeleted, undo]);

  return <UndoContext value={value}>{children}</UndoContext>;
}

export function useUndo(): UndoValue {
  const value = useContext(UndoContext);
  if (!value) throw new Error("useUndo must be used within <UndoProvider>");
  return value;
}
