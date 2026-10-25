import { useKeymaps } from "../../contexts/keymaps.js";
import { useTheme } from "../../contexts/theme.js";

interface TimelineEmptyStateProps {
  filterQuery: string;
}

export function TimelineEmptyState({ filterQuery }: TimelineEmptyStateProps) {
  const theme = useTheme();
  const keymaps = useKeymaps();

  return (
    <box padding={1}>
      <text fg={theme.muted}>
        {filterQuery
          ? `No notes matching filter "${filterQuery}". Press '/' or Esc to clear.`
          : `No journal notes yet. Press '${keymaps.quick_capture}' to create one!`}
      </text>
    </box>
  );
}
