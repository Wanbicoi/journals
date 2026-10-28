import { getEffectiveDateStr } from "@journals/core";
import type { ScrollBoxRenderable } from "@opentui/core";
import { useEffect, useMemo, useRef } from "react";
import { ErrorState } from "../../components/ErrorState.js";
import { useModals } from "../../contexts/modals.js";
import { useNavigation } from "../../contexts/navigation.js";
import { useNotifications } from "../../contexts/notification.js";
import { useDayStartHour, useTheme } from "../../contexts/theme.js";
import { useUndo } from "../../contexts/undo.js";
import { editInEditor } from "../../editor.js";
import { filterEntries } from "../../hooks/filterJournal.js";
import type { Entry } from "../../hooks/queries.js";
import { useEntries } from "../../hooks/queries.js";
import { useEntryMutations } from "../../hooks/useEntryMutations.js";
import { useSelectionById } from "../../hooks/useSelection.js";
import { type TimelineDateGroup, TimelineDayGroup } from "./TimelineDayGroup.js";
import { TimelineEmptyState } from "./TimelineEmptyState.js";
import { useTimelineKeymaps } from "./useTimelineKeymaps.js";

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

// @unit journals.views.timeline
// @summary Timeline view: capture, edit, tag, delete
// @details Loads its own entries, owns its selection, and dispatches actions to the modal and
// | undo contexts. Nothing here is passed down from the app shell.
export function TimelineView() {
  const scrollBoxRef = useRef<ScrollBoxRenderable | null>(null);
  const theme = useTheme();
  const dayStartHour = useDayStartHour();
  const { filter } = useNavigation();
  const { open } = useModals();
  const { undo } = useUndo();
  const { notify } = useNotifications();
  const { updateEntryContent } = useEntryMutations();

  // @call journals.hooks.entries Load the timeline's journal entries
  const { data: entries = [], isLoading, isError, error, refetch } = useEntries();
  // @call journals.hooks.filter-entries Filter entries by the search query
  const filteredEntries = useMemo(() => filterEntries(entries, filter), [entries, filter]);
  // @call journals.hooks.selection Keep the selected entry by id
  const selection = useSelectionById(filteredEntries);

  const editEntry = async (entry: Entry) => {
    const saved = await editInEditor(entry.content, (content) =>
      updateEntryContent(entry.id, content),
    );
    if (saved) notify("Updated note content via editor!");
  };

  useTimelineKeymaps({
    entries: filteredEntries,
    selectedEntryIdx: selection.selectedIndex,
    onSelectEntry: selection.selectIndex,
    // @call journals.contexts.modals Open the quick capture modal
    onQuickCapture: () => open({ name: "capture" }),
    // @call journals.contexts.modals Open the inline content editor
    onEditContent: (entry) => open({ name: "edit-content", entry }),
    // @call journals.actions.edit-in-editor Edit the selected entry in $EDITOR
    onEditEntry: (entry) => void editEntry(entry),
    // @call journals.contexts.modals Open the project reassignment modal
    onEditProject: (entry) => open({ name: "edit-project", entry }),
    // @call journals.contexts.modals Open the tag editor
    onEditTags: (entry) => open({ name: "edit-tags", entry }),
    // @call journals.modals.delete-entry Confirm and soft-delete the selected entry
    onDeleteEntry: (entry) => open({ name: "delete-entry", entry }),
    // @call journals.hooks.restore-entry Restore the last deleted entry
    onUndoDelete: () => void undo(),
  });

  useEffect(() => {
    if (scrollBoxRef.current && filteredEntries[selection.selectedIndex]) {
      const selectedId = `entry-${filteredEntries[selection.selectedIndex].id}`;
      scrollBoxRef.current.scrollChildIntoView(selectedId);
    }
  }, [selection.selectedIndex, filteredEntries]);

  if (isError) {
    // @call journals.views.error-state Show a load error and offer a retry
    return <ErrorState error={error} onRetry={refetch} />;
  }

  if (isLoading) {
    return (
      <box padding={1}>
        <text fg={theme.primary}>{"Loading journal entries..."}</text>
      </box>
    );
  }

  if (filteredEntries.length === 0) {
    return <TimelineEmptyState />;
  }

  const groups = groupEntriesByDate(filteredEntries, dayStartHour);

  return (
    <scrollbox ref={scrollBoxRef} flexGrow={1} paddingLeft={1} paddingRight={1}>
      {groups.map((group) => (
        <TimelineDayGroup
          key={group.dateStr}
          group={group}
          selectedEntryIdx={selection.selectedIndex}
          onSelectEntry={selection.selectIndex}
        />
      ))}
    </scrollbox>
  );
}
