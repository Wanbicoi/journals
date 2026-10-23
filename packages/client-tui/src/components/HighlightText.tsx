import type { ThemePalette } from "../theme.js";

interface HighlightTextProps {
  text: string;
  query: string;
  theme: ThemePalette;
  defaultFg?: string;
  selectable?: boolean;
}

export function HighlightText({
  text,
  query,
  theme,
  defaultFg,
  selectable = true,
}: HighlightTextProps) {
  const fg = defaultFg || theme.fg;

  if (!query || !query.trim()) {
    return (
      <text fg={fg} selectable={selectable}>
        {text}
      </text>
    );
  }

  // Split query terms or clean text
  const cleaned = query.replace(/[^\p{L}\p{N}_\s]/gu, " ").trim();
  const terms = Array.from(new Set(cleaned.split(/\s+/).filter(Boolean)));

  if (terms.length === 0) {
    return (
      <text fg={fg} selectable={selectable}>
        {text}
      </text>
    );
  }

  const escapedTerms = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(${escapedTerms.join("|")})`, "gi");
  const parts = text.split(regex);

  return (
    <text fg={fg} selectable={selectable}>
      {parts.map((part, idx) => {
        const isMatch = terms.some((t) => t.toLowerCase() === part.toLowerCase());
        if (isMatch) {
          return (
            <span key={`${idx}-${part}`} fg={theme.selectedFg} bg={theme.accent}>
              {part}
            </span>
          );
        }
        return (
          <span key={`${idx}-${part}`} fg={fg}>
            {part}
          </span>
        );
      })}
    </text>
  );
}
