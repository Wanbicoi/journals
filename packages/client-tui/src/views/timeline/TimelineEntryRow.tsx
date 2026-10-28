import { HighlightText } from "../../components/HighlightText.js";
import { useIcons } from "../../contexts/icons.js";
import { useNavigation } from "../../contexts/navigation.js";
import { useTheme } from "../../contexts/theme.js";
import type { Entry } from "../../hooks/queries.js";

interface TimelineEntryRowProps {
  entry: Entry;
  isSelected: boolean;
  onSelect: () => void;
}

export function TimelineEntryRow({ entry, isSelected, onSelect }: TimelineEntryRowProps) {
  const icons = useIcons();
  const theme = useTheme();
  const { filter } = useNavigation();
  const time = new Date(entry.createdAt).toTimeString().slice(0, 5);

  return (
    <box id={`entry-${entry.id}`} flexDirection="column" marginBottom={1} onMouseDown={onSelect}>
      {/* Header row: Left gutter indicator + Time + Project + Tags */}
      <box flexDirection="row">
        <text fg={isSelected ? theme.primary : theme.muted}>
          {isSelected ? `${icons.cursor} ` : "  "}
        </text>
        <text fg={isSelected ? theme.primary : theme.muted}>{`${time}  `}</text>
        <text fg={isSelected ? theme.primary : theme.secondary}>
          {entry.projectName
            ? `${icons.project} @${entry.projectName} `
            : `${icons.global} GLOBAL `}
        </text>
        {entry.breakDays > 0 && (
          <text fg={theme.warning || "yellow"}>{`${icons.break} ${entry.breakDays}d break `}</text>
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
            query={filter}
            theme={theme}
            defaultFg={theme.fg}
            selectable
          />
        ))}
      </box>
    </box>
  );
}
