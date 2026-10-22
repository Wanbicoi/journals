import { useState } from "react";
import { detectSuggestionQuery } from "../suggest.js";
import type { Project, TagInfo } from "./useJournalData.js";

export function useSuggestions(projects: Project[], tags: TagInfo[]) {
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(0);

  function getSuggestions(input: string) {
    const queryInfo = detectSuggestionQuery(input);
    if (!queryInfo) return null;

    if (queryInfo.type === "project") {
      const matches = projects
        .filter((p) => p.name.toLowerCase().startsWith(queryInfo.query.toLowerCase()))
        .map((p) => p.name);
      return { ...queryInfo, matches };
    }

    const matches = tags
      .filter((t) => t.name.toLowerCase().startsWith(queryInfo.query.toLowerCase()))
      .map((t) => t.name);
    return { ...queryInfo, matches };
  }

  function applySuggestion(input: string, suggestions: ReturnType<typeof getSuggestions>): string {
    if (!suggestions || suggestions.matches.length === 0) return input;
    const match = suggestions.matches[activeSuggestionIdx % suggestions.matches.length];
    const prefix = suggestions.type === "project" ? "@" : "#";
    const before = input.slice(0, suggestions.triggerIndex);
    setActiveSuggestionIdx(0);
    return `${before}${prefix}${match} `;
  }

  return {
    activeSuggestionIdx,
    setActiveSuggestionIdx,
    getSuggestions,
    applySuggestion,
  };
}
