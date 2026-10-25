import { getEffectiveDateStr } from "@journals/core";
import { useKeyboard } from "@opentui/react";
import { useKeymaps } from "../../contexts/keymaps.js";
import { useDayStartHour } from "../../contexts/theme.js";
import { openExternalEditor } from "../../editor.js";
import type { Entry } from "../../hooks/useJournalData.js";
import { matchesAnyBinding, matchesBinding } from "../../keymap.js";

interface UseTimelineKeymapsOptions {
  entries: Entry[];
  selectedEntryIdx: number;
  isActive: boolean;
  onSelectEntry?: (idx: number) => void;
  onStatusMessage?: (msg: string) => void;
  onQuickCapture?: () => void;
  onEditContent?: (entry: Entry) => void;
  onEditProject?: (entry: Entry) => void;
  onEditTags?: (entry: Entry) => void;
  onDeleteEntry?: (entry: Entry) => void;
  onUndoDelete?: () => void;
  onOpenEditor?: (entry: Entry) => void;
  onUpdateEntryContent?: (id: string, content: string) => Promise<void> | void;
}

export function useTimelineKeymaps({
  entries,
  selectedEntryIdx,
  isActive,
  onSelectEntry,
  onStatusMessage,
  onQuickCapture,
  onEditContent,
  onEditProject,
  onEditTags,
  onDeleteEntry,
  onUndoDelete,
  onOpenEditor,
  onUpdateEntryContent,
}: UseTimelineKeymapsOptions) {
  const keymaps = useKeymaps();
  const dayStartHour = useDayStartHour();

  useKeyboard(async (key) => {
    if (!isActive) return;

    // Navigation: j/k, down/up, g/G
    if (matchesAnyBinding(key, "j", "down", keymaps.down)) {
      onSelectEntry?.(Math.min(selectedEntryIdx + 1, Math.max(0, entries.length - 1)));
    } else if (matchesAnyBinding(key, "k", "up", keymaps.up)) {
      onSelectEntry?.(Math.max(0, selectedEntryIdx - 1));
    } else if (matchesBinding(key, "g")) {
      onSelectEntry?.(0);
    } else if (matchesBinding(key, "G")) {
      onSelectEntry?.(Math.max(0, entries.length - 1));
    } else if (matchesBinding(key, "T") || (key.shift && (key.name === "t" || key.name === "T"))) {
      // Date jump: Today (Shift+T or uppercase T)
      const todayStr = getEffectiveDateStr(Date.now(), dayStartHour);
      const todayIdx = entries.findIndex(
        (e) => getEffectiveDateStr(e.createdAt, dayStartHour) === todayStr,
      );
      if (todayIdx !== -1) {
        onSelectEntry?.(todayIdx);
        onStatusMessage?.(`Jumped to Today (${todayStr})`);
      } else {
        onStatusMessage?.(`No entries logged yet for Today (${todayStr})`);
      }
    } else if (matchesBinding(key, "]")) {
      // Date jump: Next day
      const currentEntry = entries[selectedEntryIdx];
      if (currentEntry) {
        const curDate = getEffectiveDateStr(currentEntry.createdAt, dayStartHour);
        const nextIdx = entries.findIndex(
          (e, i) =>
            i > selectedEntryIdx && getEffectiveDateStr(e.createdAt, dayStartHour) !== curDate,
        );
        if (nextIdx !== -1) {
          onSelectEntry?.(nextIdx);
          const nextDate = getEffectiveDateStr(entries[nextIdx].createdAt, dayStartHour);
          onStatusMessage?.(`Jumped to ${nextDate}`);
        }
      }
    } else if (matchesBinding(key, "[")) {
      // Date jump: Prev day
      const currentEntry = entries[selectedEntryIdx];
      if (currentEntry) {
        const curDate = getEffectiveDateStr(currentEntry.createdAt, dayStartHour);
        for (let i = selectedEntryIdx - 1; i >= 0; i--) {
          const thatDate = getEffectiveDateStr(entries[i].createdAt, dayStartHour);
          if (thatDate !== curDate) {
            const groupStart = entries.findIndex(
              (e) => getEffectiveDateStr(e.createdAt, dayStartHour) === thatDate,
            );
            onSelectEntry?.(groupStart !== -1 ? groupStart : i);
            onStatusMessage?.(`Jumped to ${thatDate}`);
            break;
          }
        }
      }
    } else if (matchesAnyBinding(key, "u", "U")) {
      // Undo soft delete: u
      onUndoDelete?.();
    } else if (matchesAnyBinding(key, "c", keymaps.quick_capture)) {
      // Action modal triggers: c (quick capture)
      onQuickCapture?.();
    } else if (matchesBinding(key, "e")) {
      // Action modal triggers: e (edit content)
      const entry = entries[selectedEntryIdx];
      if (entry) {
        onEditContent?.(entry);
      }
    } else if (matchesAnyBinding(key, "p", keymaps.edit_project)) {
      // Action modal triggers: p (reassign project)
      const entry = entries[selectedEntryIdx];
      if (entry) {
        onEditProject?.(entry);
      }
    } else if (matchesBinding(key, "t")) {
      // Action modal triggers: t (edit tags)
      const entry = entries[selectedEntryIdx];
      if (entry && onEditTags) {
        onEditTags(entry);
      } else {
        const todayStr = getEffectiveDateStr(Date.now(), dayStartHour);
        const todayIdx = entries.findIndex(
          (e) => getEffectiveDateStr(e.createdAt, dayStartHour) === todayStr,
        );
        if (todayIdx !== -1) {
          onSelectEntry?.(todayIdx);
          onStatusMessage?.(`Jumped to Today (${todayStr})`);
        } else {
          onStatusMessage?.(`No entries logged yet for Today (${todayStr})`);
        }
      }
    } else if (matchesAnyBinding(key, "d", keymaps.delete_entry)) {
      // Action modal triggers: d (delete confirm)
      const entry = entries[selectedEntryIdx];
      if (entry) {
        onDeleteEntry?.(entry);
      }
    } else if (matchesBinding(key, "o")) {
      // Action modal triggers: o (open in $EDITOR)
      const entry = entries[selectedEntryIdx];
      if (entry) {
        if (onOpenEditor) {
          onOpenEditor(entry);
        } else if (onUpdateEntryContent) {
          const updated = openExternalEditor(entry.content);
          if (updated !== entry.content) {
            await onUpdateEntryContent(entry.id, updated);
            onStatusMessage?.("Updated note content via editor!");
          }
        }
      }
    }
  });
}
