import { useIcons } from "../../contexts/icons.js";
import { useTheme } from "../../contexts/theme.js";
import type { Entry } from "../../hooks/useJournalData.js";
import { TimelineEntryRow } from "./TimelineEntryRow.js";

export interface TimelineDateGroup {
  dateStr: string;
  items: { entry: Entry; globalIdx: number }[];
}

interface TimelineDayGroupProps {
  group: TimelineDateGroup;
  selectedEntryIdx: number;
  filterQuery: string;
  onSelectEntry: (idx: number) => void;
}

export function TimelineDayGroup({
  group,
  selectedEntryIdx,
  filterQuery,
  onSelectEntry,
}: TimelineDayGroupProps) {
  const icons = useIcons();
  const theme = useTheme();
  const date = new Date(`${group.dateStr}T12:00:00`);
  const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
  const count = group.items.length;

  return (
    <box flexDirection="column" marginTop={1}>
      {/* Daily Group Date Header */}
      <box flexDirection="row" marginBottom={1}>
        <text fg={theme.accent}>{`${icons.calendar} ${group.dateStr}  ${weekday}  `}</text>
        <text fg={theme.muted}>{`(${count} ${count === 1 ? "entry" : "entries"})`}</text>
      </box>

      {/* Entries for this Day */}
      {group.items.map(({ entry, globalIdx }) => (
        <TimelineEntryRow
          key={entry.id}
          entry={entry}
          isSelected={globalIdx === selectedEntryIdx}
          filterQuery={filterQuery}
          onSelect={() => onSelectEntry(globalIdx)}
        />
      ))}
    </box>
  );
}
