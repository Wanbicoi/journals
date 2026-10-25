import { useCallback, useState } from "react";
import type { Entry } from "./useJournalData.js";

interface UseUndoDeleteOptions {
  restoreEntry: (id: string) => Promise<unknown>;
  onStatusMessage: (message: string) => void;
}

/**
 * Remembers the last soft-deleted entry so `u` can restore it. The view only calls `undo`; the
 * hook owns the restore mutation and the user-facing status.
 */
export function useUndoDelete({ restoreEntry, onStatusMessage }: UseUndoDeleteOptions) {
  const [lastDeletedEntry, setLastDeletedEntry] = useState<Entry | null>(null);

  const rememberDeleted = useCallback((entry: Entry) => {
    setLastDeletedEntry(entry);
  }, []);

  const undo = useCallback(async () => {
    if (!lastDeletedEntry) {
      onStatusMessage("No recently deleted entry to undo");
      return;
    }

    await restoreEntry(lastDeletedEntry.id);
    onStatusMessage(`Restored entry "${lastDeletedEntry.content.slice(0, 30)}..."`);
    setLastDeletedEntry(null);
  }, [lastDeletedEntry, onStatusMessage, restoreEntry]);

  return { lastDeletedEntry, rememberDeleted, undo };
}
