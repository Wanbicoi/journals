import { useKeymaps } from "../../contexts/keymaps.js";
import { useNavigation } from "../../contexts/navigation.js";
import { useTheme } from "../../contexts/theme.js";
import { bindingLabel } from "../../keymap.js";

export function TimelineEmptyState() {
  const theme = useTheme();
  const keymaps = useKeymaps();
  const { filter } = useNavigation();

  return (
    <box padding={1}>
      <text fg={theme.muted}>
        {filter
          ? `No notes matching filter "${filter}". Press '${bindingLabel(keymaps.global.search_filter)}' or ${bindingLabel(keymaps.global.cancel)} to clear.`
          : `No journal notes yet. Press '${bindingLabel(keymaps.timeline.quick_capture)}' to create one!`}
      </text>
    </box>
  );
}
