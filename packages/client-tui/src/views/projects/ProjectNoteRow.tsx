import { HighlightText } from "../../components/HighlightText.js";
import { useIcons } from "../../contexts/icons.js";
import { useNavigation } from "../../contexts/navigation.js";
import { useTheme } from "../../contexts/theme.js";
import type { Entry } from "../../hooks/queries.js";

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto", style: "narrow" });

function formatRelativeTime(dateInput: number | string | Date): string {
  const diffSec = Math.round((new Date(dateInput).getTime() - Date.now()) / 1000);
  if (Math.abs(diffSec) < 45) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
  const diffHour = Math.round(diffMin / 60);
  if (Math.abs(diffHour) < 24) return rtf.format(diffHour, "hour");
  const diffDay = Math.round(diffHour / 24);
  if (Math.abs(diffDay) < 30) return rtf.format(diffDay, "day");
  const diffMonth = Math.round(diffDay / 30);
  if (Math.abs(diffMonth) < 12) return rtf.format(diffMonth, "month");
  const diffYear = Math.round(diffDay / 365);
  return rtf.format(diffYear, "year");
}

interface ProjectNoteRowProps {
  entry: Entry;
}

export function ProjectNoteRow({ entry }: ProjectNoteRowProps) {
  const icons = useIcons();
  const theme = useTheme();
  const { filter } = useNavigation();

  return (
    <box flexDirection="column" marginBottom={1} paddingLeft={1}>
      <box flexDirection="row">
        <text
          fg={theme.muted}
        >{`${formatRelativeTime(entry.createdAt)} ${icons.bullet} ${new Date(entry.createdAt).toISOString().slice(0, 10)} ${new Date(entry.createdAt).toTimeString().slice(0, 5)} `}</text>
        {entry.tags.map((tag) => (
          <text key={tag} fg={theme.tag}>{`${icons.tag} #${tag} `}</text>
        ))}
      </box>
      <box paddingLeft={2} marginTop={0}>
        <HighlightText text={entry.content} query={filter} theme={theme} defaultFg={theme.fg} />
      </box>
    </box>
  );
}
