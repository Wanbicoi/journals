import { useTheme } from "../contexts/theme.js";

interface SuggestionListProps {
  matches: string[];
  activeIdx: number;
}

/** Keep the footer compact on short terminals while still hinting that more matches exist. */
const MAX_VISIBLE = 6;

// @unit journals.views.suggestion-list
// @summary Render the shared suggestion rows inside a modal footer
// @details Matches are already complete insertion tokens, so the list never adds a trigger itself.
export function SuggestionList({ matches, activeIdx }: SuggestionListProps) {
  const theme = useTheme();

  if (matches.length === 0) return null;

  // Keep the active row visible when the list is longer than the box.
  const start = Math.max(
    0,
    Math.min(activeIdx - Math.floor(MAX_VISIBLE / 2), matches.length - MAX_VISIBLE),
  );

  return (
    <box flexDirection="column">
      {matches.slice(start, start + MAX_VISIBLE).map((match, offset) => {
        const idx = start + offset;
        const active = idx === activeIdx;
        return (
          <box key={match} width="100%" backgroundColor={active ? theme.primary : undefined}>
            <text fg={active ? theme.selectedFg : theme.fg}>{match}</text>
          </box>
        );
      })}
    </box>
  );
}
