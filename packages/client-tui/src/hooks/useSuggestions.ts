import { useState } from "react";
import { type SuggestionType, detectSuggestionQuery } from "../suggest.js";
import type { Project, TagInfo } from "./useJournalData.js";

export const DEFAULT_BREAK_PRESETS = [
  "/break 1d",
  "/break 2d",
  "/break 3d",
  "/break 5d",
  "/break 7d",
  "/break 14d",
];

export function useSuggestions(projects: Project[], tags: TagInfo[]) {
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(0);

  function getSuggestions(input: string, allowedTypes?: SuggestionType[]) {
    const queryInfo = detectSuggestionQuery(input);
    if (!queryInfo) return null;

    if (allowedTypes && !allowedTypes.includes(queryInfo.type)) {
      return null;
    }

    if (queryInfo.type === "project") {
      const matches = projects
        .filter((p) => p.name.toLowerCase().startsWith(queryInfo.query.toLowerCase()))
        .map((p) => p.name);
      return { ...queryInfo, matches };
    }

    if (queryInfo.type === "tag") {
      const matches = tags
        .filter((t) => t.name.toLowerCase().startsWith(queryInfo.query.toLowerCase()))
        .map((t) => t.name);
      return { ...queryInfo, matches };
    }

    if (queryInfo.type === "break") {
      const q = queryInfo.query.toLowerCase().trim();
      // If query is "/", "/b", "/br", "/bre", "/brea", "/break" or "/break "
      if (q === "/" || "/break".startsWith(q) || q === "/break ") {
        return { ...queryInfo, matches: DEFAULT_BREAK_PRESETS };
      }

      // Check if user typed specific duration e.g. "/break 4", "/break 10d", "/break:3d"
      const numMatch = q.match(/^\/break(?::|\s+)?(\d+)(d)?$/);
      if (numMatch) {
        const num = numMatch[1];
        const custom = `/break ${num}d`;
        const filtered = DEFAULT_BREAK_PRESETS.filter((p) => p.startsWith(`/break ${num}`));
        const matches = filtered.includes(custom) ? filtered : [custom, ...filtered];
        return { ...queryInfo, matches };
      }

      const filtered = DEFAULT_BREAK_PRESETS.filter((p) => p.startsWith(q));
      return { ...queryInfo, matches: filtered.length > 0 ? filtered : DEFAULT_BREAK_PRESETS };
    }

    return null;
  }

  function applySuggestion(input: string, suggestions: ReturnType<typeof getSuggestions>): string {
    if (!suggestions || suggestions.matches.length === 0) return input;
    const match = suggestions.matches[activeSuggestionIdx % suggestions.matches.length];
    const before = input.slice(0, suggestions.triggerIndex);
    setActiveSuggestionIdx(0);

    if (suggestions.type === "break") {
      return `${before}${match} `;
    }

    const prefix = suggestions.type === "project" ? "@" : "#";
    return `${before}${prefix}${match} `;
  }

  return {
    activeSuggestionIdx,
    setActiveSuggestionIdx,
    getSuggestions,
    applySuggestion,
  };
}
