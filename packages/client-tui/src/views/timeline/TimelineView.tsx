import { type IconSet, getEffectiveDateStr } from "@journals/core";
import type { ScrollBoxRenderable } from "@opentui/core";
import { useKeyboard } from "@opentui/react";
import { useEffect, useRef } from "react";
import { config } from "../../api/client.js";
import { HighlightText } from "../../components/HighlightText.js";
import { openExternalEditor } from "../../editor.js";
import type { Entry } from "../../hooks/useJournalData.js";
import { matchesAnyBinding, matchesBinding } from "../../keymap.js";
import type { ThemePalette } from "../../theme.js";

interface TimelineViewProps {
  entries: Entry[];
  selectedEntryIdx: number;
  onSelectEntry?: (idx: number) => void;
  filterQuery: string;
  quickCaptureKey: string;
  loading?: boolean;
  icons: IconSet;
  theme: ThemePalette;
  isActive?: boolean;
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

interface DateGroup {
  dateStr: string;
  items: { entry: Entry; globalIdx: number }[];
}

export function TimelineView({
  entries,
  selectedEntryIdx,
  onSelectEntry,
  filterQuery,
  quickCaptureKey,
  loading = false,
  icons,
  theme,
  isActive = true,
  onStatusMessage,
  onQuickCapture,
  onEditContent,
  onEditProject,
  onEditTags,
  onDeleteEntry,
  onUndoDelete,
  onOpenEditor,
  onUpdateEntryContent,
}: TimelineViewProps) {
  const scrollBoxRef = useRef<ScrollBoxRenderable | null>(null);

  useEffect(() => {
    if (scrollBoxRef.current && entries[selectedEntryIdx]) {
      const selectedId = `entry-${entries[selectedEntryIdx].id}`;
      scrollBoxRef.current.scrollChildIntoView(selectedId);
    }
  }, [selectedEntryIdx, entries]);

  useKeyboard(async (key) => {
    if (!isActive) return;
    const keymaps = config.keymaps;

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
      const dayStartHour = config.appearance.day_start_hour ?? 0;
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
        const dayStartHour = config.appearance.day_start_hour ?? 0;
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
        const dayStartHour = config.appearance.day_start_hour ?? 0;
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
        const dayStartHour = config.appearance.day_start_hour ?? 0;
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

  if (loading) {
    return (
      <box padding={1}>
        <text fg={theme.primary}>{"Loading journal entries..."}</text>
      </box>
    );
  }

  if (entries.length === 0) {
    return (
      <box padding={1}>
        <text fg={theme.muted}>
          {filterQuery
            ? `No notes matching filter "${filterQuery}". Press '/' or Esc to clear.`
            : `No journal notes yet. Press '${quickCaptureKey}' to create one!`}
        </text>
      </box>
    );
  }

  // Group entries by Date (YYYY-MM-DD)
  const groups: DateGroup[] = [];
  let currentGroup: DateGroup | null = null;

  entries.forEach((entry, idx) => {
    const dayStartHour = config.appearance.day_start_hour ?? 0;
    const dateStr = getEffectiveDateStr(entry.createdAt, dayStartHour);

    if (!currentGroup || currentGroup.dateStr !== dateStr) {
      currentGroup = { dateStr, items: [] };
      groups.push(currentGroup);
    }
    currentGroup.items.push({ entry, globalIdx: idx });
  });

  return (
    <scrollbox ref={scrollBoxRef} flexGrow={1} paddingLeft={1} paddingRight={1}>
      {groups.map((group) => {
        const d = new Date(`${group.dateStr}T12:00:00`);
        const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
        const count = group.items.length;

        return (
          <box key={group.dateStr} flexDirection="column" marginTop={1}>
            {/* Daily Group Date Header */}
            <box flexDirection="row" marginBottom={1}>
              <text fg={theme.accent}>{`${icons.calendar} ${group.dateStr}  ${weekday}  `}</text>
              <text fg={theme.muted}>{`(${count} ${count === 1 ? "entry" : "entries"})`}</text>
            </box>

            {/* Entries for this Day */}
            {group.items.map(({ entry, globalIdx }) => {
              const isSel = globalIdx === selectedEntryIdx;
              const time = new Date(entry.createdAt).toTimeString().slice(0, 5);

              return (
                <box
                  key={entry.id}
                  id={`entry-${entry.id}`}
                  flexDirection="column"
                  marginBottom={1}
                  onMouseDown={() => {
                    onSelectEntry?.(globalIdx);
                  }}
                >
                  {/* Header row: Left gutter indicator + Time + Project + Tags */}
                  <box flexDirection="row">
                    <text fg={isSel ? theme.primary : theme.muted}>
                      {isSel ? `${icons.cursor} ` : "  "}
                    </text>
                    <text fg={isSel ? theme.primary : theme.muted}>{`${time}  `}</text>
                    <text fg={isSel ? theme.primary : theme.secondary}>
                      {entry.projectName
                        ? `${icons.project} @${entry.projectName} `
                        : `${icons.global} GLOBAL `}
                    </text>
                    {entry.breakDays > 0 && (
                      <text
                        fg={theme.warning || "yellow"}
                      >{`${icons.break} ${entry.breakDays}d break `}</text>
                    )}
                    {entry.tags.map((t) => (
                      <text key={t} fg={theme.tag}>{`${icons.tag} #${t} `}</text>
                    ))}
                  </box>

                  {/* Content lines: cleanly indented under metadata */}
                  <box flexDirection="column" paddingLeft={4}>
                    {entry.content.split("\n").map((line, lIdx) => (
                      <HighlightText
                        key={`${entry.id}-line-${lIdx}`}
                        text={line || " "}
                        query={filterQuery}
                        theme={theme}
                        defaultFg={theme.fg}
                        selectable
                      />
                    ))}
                  </box>
                </box>
              );
            })}
          </box>
        );
      })}
    </scrollbox>
  );
}
