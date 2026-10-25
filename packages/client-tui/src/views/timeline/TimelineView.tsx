import { getEffectiveDateStr } from "@journals/core";
import type { ScrollBoxRenderable } from "@opentui/core";
import { useEffect, useRef } from "react";
import { useDayStartHour, useTheme } from "../../contexts/theme.js";
import type { Entry } from "../../hooks/useJournalData.js";
import { type TimelineDateGroup, TimelineDayGroup } from "./TimelineDayGroup.js";
import { TimelineEmptyState } from "./TimelineEmptyState.js";
import { useTimelineKeymaps } from "./useTimelineKeymaps.js";

interface TimelineViewProps {
  entries: Entry[];
  selectedEntryIdx: number;
  onSelectEntry?: (idx: number) => void;
  filterQuery: string;
  loading?: boolean;
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

function groupEntriesByDate(entries: Entry[], dayStartHour: number): TimelineDateGroup[] {
  const groups: TimelineDateGroup[] = [];
  let currentGroup: TimelineDateGroup | null = null;

  entries.forEach((entry, idx) => {
    const dateStr = getEffectiveDateStr(entry.createdAt, dayStartHour);
    if (!currentGroup || currentGroup.dateStr !== dateStr) {
      currentGroup = { dateStr, items: [] };
      groups.push(currentGroup);
    }
    currentGroup.items.push({ entry, globalIdx: idx });
  });

  return groups;
}

export function TimelineView({
  entries,
  selectedEntryIdx,
  onSelectEntry,
  filterQuery,
  loading = false,
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
  const theme = useTheme();
  const dayStartHour = useDayStartHour();

  useTimelineKeymaps({
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
  });

  useEffect(() => {
    if (scrollBoxRef.current && entries[selectedEntryIdx]) {
      const selectedId = `entry-${entries[selectedEntryIdx].id}`;
      scrollBoxRef.current.scrollChildIntoView(selectedId);
    }
  }, [selectedEntryIdx, entries]);

  if (loading) {
    return (
      <box padding={1}>
        <text fg={theme.primary}>{"Loading journal entries..."}</text>
      </box>
    );
  }

  if (entries.length === 0) {
    return <TimelineEmptyState filterQuery={filterQuery} />;
  }

  const groups = groupEntriesByDate(entries, dayStartHour);

  return (
    <scrollbox ref={scrollBoxRef} flexGrow={1} paddingLeft={1} paddingRight={1}>
      {groups.map((group) => (
        <TimelineDayGroup
          key={group.dateStr}
          group={group}
          selectedEntryIdx={selectedEntryIdx}
          filterQuery={filterQuery}
          onSelectEntry={onSelectEntry ?? (() => {})}
        />
      ))}
    </scrollbox>
  );
}
