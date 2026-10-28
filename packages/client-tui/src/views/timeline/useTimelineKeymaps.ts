import { getEffectiveDateStr } from "@journals/core";
import { useNotifications } from "../../contexts/notification.js";
import { useDayStartHour } from "../../contexts/theme.js";
import type { Entry } from "../../hooks/queries.js";
import { useScopedKeymaps } from "../../hooks/useScopedKeymaps.js";
import { clampIndex } from "../../hooks/useSelection.js";

interface UseTimelineKeymapsOptions {
  entries: Entry[];
  selectedEntryIdx: number;
  onSelectEntry?: (idx: number) => void;
  onQuickCapture?: () => void;
  onEditContent?: (entry: Entry) => void;
  onEditEntry?: (entry: Entry) => void;
  onEditProject?: (entry: Entry) => void;
  onEditTags?: (entry: Entry) => void;
  onDeleteEntry?: (entry: Entry) => void;
  onUndoDelete?: () => void;
}

export function useTimelineKeymaps({
  entries,
  selectedEntryIdx,
  onSelectEntry,
  onQuickCapture,
  onEditContent,
  onEditEntry,
  onEditProject,
  onEditTags,
  onDeleteEntry,
  onUndoDelete,
}: UseTimelineKeymapsOptions) {
  const dayStartHour = useDayStartHour();
  const { notify } = useNotifications();
  const selected = entries[selectedEntryIdx];

  useScopedKeymaps("timeline", {
    down: () => onSelectEntry?.(clampIndex(selectedEntryIdx + 1, entries.length)),
    up: () => onSelectEntry?.(clampIndex(selectedEntryIdx - 1, entries.length)),
    move_top: () => onSelectEntry?.(0),
    move_bottom: () => onSelectEntry?.(clampIndex(entries.length - 1, entries.length)),

    jump_today: () => {
      const todayStr = getEffectiveDateStr(Date.now(), dayStartHour);
      const todayIdx = entries.findIndex(
        (e) => getEffectiveDateStr(e.createdAt, dayStartHour) === todayStr,
      );
      if (todayIdx !== -1) {
        onSelectEntry?.(todayIdx);
        notify(`Jumped to Today (${todayStr})`);
      } else {
        notify(`No entries logged yet for Today (${todayStr})`);
      }
    },

    next_day: () => {
      if (!selected) return;
      const curDate = getEffectiveDateStr(selected.createdAt, dayStartHour);
      const nextIdx = entries.findIndex(
        (e, i) =>
          i > selectedEntryIdx && getEffectiveDateStr(e.createdAt, dayStartHour) !== curDate,
      );
      if (nextIdx !== -1) {
        onSelectEntry?.(nextIdx);
        const nextDate = getEffectiveDateStr(entries[nextIdx].createdAt, dayStartHour);
        notify(`Jumped to ${nextDate}`);
      }
    },

    prev_day: () => {
      if (!selected) return;
      const curDate = getEffectiveDateStr(selected.createdAt, dayStartHour);
      for (let i = selectedEntryIdx - 1; i >= 0; i--) {
        const thatDate = getEffectiveDateStr(entries[i].createdAt, dayStartHour);
        if (thatDate !== curDate) {
          const groupStart = entries.findIndex(
            (e) => getEffectiveDateStr(e.createdAt, dayStartHour) === thatDate,
          );
          onSelectEntry?.(groupStart !== -1 ? groupStart : i);
          notify(`Jumped to ${thatDate}`);
          break;
        }
      }
    },

    undo: () => onUndoDelete?.(),
    quick_capture: () => onQuickCapture?.(),
    edit_entry: () => selected && onEditContent?.(selected),
    edit_project: () => selected && onEditProject?.(selected),
    edit_tags: () => selected && onEditTags?.(selected),
    delete_entry: () => selected && onDeleteEntry?.(selected),
    open_editor: () => selected && onEditEntry?.(selected),
  });
}
