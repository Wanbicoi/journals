import type { ScrollBoxRenderable } from "@opentui/core";
import { useEffect, useRef } from "react";
import { HighlightText } from "../../components/HighlightText.js";
import type { Entry } from "../../hooks/useJournalData.js";
import type { ThemePalette } from "../../theme.js";

interface TimelineViewProps {
  entries: Entry[];
  selectedEntryIdx: number;
  onSelectEntry?: (idx: number) => void;
  filterQuery: string;
  quickCaptureKey: string;
  loading?: boolean;
  icons: Record<string, string>;
  theme: ThemePalette;
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
}: TimelineViewProps) {
  const scrollBoxRef = useRef<ScrollBoxRenderable | null>(null);

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
    const d = new Date(entry.createdAt);
    const dateStr = d.toISOString().slice(0, 10);

    if (!currentGroup || currentGroup.dateStr !== dateStr) {
      currentGroup = { dateStr, items: [] };
      groups.push(currentGroup);
    }
    currentGroup.items.push({ entry, globalIdx: idx });
  });

  return (
    <scrollbox ref={scrollBoxRef} flexGrow={1} paddingLeft={1} paddingRight={1}>
      {groups.map((group) => (
        <box key={group.dateStr} flexDirection="column">
          {/* Daily Group Date Header */}
          <box flexDirection="row" marginTop={1}>
            <text fg={theme.accent}>{`${icons.calendar || "📅"} ─── ${group.dateStr} ───`}</text>
          </box>

          {/* Entries for this Day */}
          {group.items.map(({ entry, globalIdx }) => {
            const isSel = globalIdx === selectedEntryIdx;
            const time = new Date(entry.createdAt).toTimeString().slice(0, 5);
            const borderColor = isSel ? theme.primary : theme.border;

            return (
              <box
                key={entry.id}
                id={`entry-${entry.id}`}
                flexDirection="column"
                borderStyle="single"
                borderColor={borderColor}
                backgroundColor={isSel ? theme.border : undefined}
                paddingLeft={1}
                paddingRight={1}
                onMouseDown={() => {
                  onSelectEntry?.(globalIdx);
                }}
              >
                {/* Header row inside clean border box */}
                <box flexDirection="row" justifyContent="space-between">
                  <box flexDirection="row">
                    {isSel && (
                      <text bg={theme.primary} fg={theme.selectedFg}>
                        {" SELECTED "}
                      </text>
                    )}
                    <text fg={theme.muted}>{` ${time} `}</text>
                    <text fg={theme.secondary}>{`${icons.project} @${entry.projectName} `}</text>
                    {entry.tags.map((t) => (
                      <text key={t} fg={theme.tag}>{`${icons.tag} #${t} `}</text>
                    ))}
                  </box>
                </box>

                {/* Content lines */}
                <box flexDirection="column" marginTop={0}>
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
      ))}
    </scrollbox>
  );
}
