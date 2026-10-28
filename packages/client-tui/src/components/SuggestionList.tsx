import { useTheme } from "../contexts/theme.js";

interface SuggestionListProps {
  matches: string[];
  activeIdx: number;
  prefix?: string;
}

// @unit journals.views.suggestion-list
// @summary Render the shared suggestion row under a text input
export function SuggestionList({ matches, activeIdx, prefix }: SuggestionListProps) {
  const theme = useTheme();

  if (matches.length === 0) return null;

  return (
    <box flexDirection="row" marginTop={1}>
      <text fg={theme.accent}>{"Suggestions: "}</text>
      {matches.slice(0, 4).map((m, idx) => (
        <text
          key={m}
          fg={idx === activeIdx ? theme.selectedFg : theme.muted}
          bg={idx === activeIdx ? theme.primary : undefined}
        >
          {`[${prefix ?? ""}${m}] `}
        </text>
      ))}
    </box>
  );
}
