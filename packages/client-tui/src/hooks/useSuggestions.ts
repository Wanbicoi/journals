import { quoteProjectNameForCapture } from "@journals/core";
import { useState } from "react";
import {
  BREAK_SUGGESTIONS,
  DATE_SUGGESTIONS,
  POLICY_SUGGESTIONS,
  RECURRENCE_SUGGESTIONS,
  type SuggestionMode,
  type SuggestionType,
  detectPlainSuggestionQuery,
  detectSuggestionQuery,
} from "../suggest.js";
import type { Project, TagInfo } from "./queries.js";

const COMMAND_TOKENS: Array<{ type: SuggestionType; token: string }> = [
  { type: "project", token: "/project:" },
  { type: "tag", token: "/tag:" },
  { type: "break", token: "/break:" },
  { type: "date", token: "/date:" },
  { type: "recurrence", token: "/recur:" },
  { type: "policy", token: "/policy:" },
];

function formatValueToken(type: SuggestionType, value: string): string {
  switch (type) {
    case "project":
      return `/project:${quoteProjectNameForCapture(value)}`;
    case "tag":
      return `/tag:${value}`;
    case "break":
      return `/break:${value}`;
    case "date":
      return `/date:${value}`;
    case "recurrence":
      return `/recur:${value}`;
    case "policy":
      return `/policy:${value}`;
    default:
      return value;
  }
}

// @unit journals.hooks.suggestions
// @summary Suggest project, tag, break, date, recurrence, and policy values
export function useSuggestions(projects: Project[], tags: TagInfo[]) {
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(0);

  function getSuggestions(
    input: string,
    allowedTypes?: SuggestionType[],
    mode: SuggestionMode = "commands",
  ) {
    if (mode === "plain") {
      const type = allowedTypes?.[0] === "tag" ? "tag" : "project";
      const queryInfo = detectPlainSuggestionQuery(input, type);
      const matches =
        type === "project"
          ? projects
              .filter((project) =>
                project.name.toLowerCase().startsWith(queryInfo.query.toLowerCase()),
              )
              .map((project) => project.name)
          : tags
              .filter((tag) => tag.name.toLowerCase().startsWith(queryInfo.query.toLowerCase()))
              .map((tag) => tag.name);
      return { ...queryInfo, mode, matches };
    }

    const queryInfo = detectSuggestionQuery(input);
    if (!queryInfo) return null;

    if (queryInfo.type === "command") {
      const matches = COMMAND_TOKENS.filter(({ type, token }) => {
        if (allowedTypes && !allowedTypes.includes(type)) return false;
        return token.slice(1, -1).startsWith(queryInfo.query);
      }).map(({ token }) => token);
      return { ...queryInfo, mode, matches };
    }

    if (allowedTypes && !allowedTypes.includes(queryInfo.type)) {
      return null;
    }

    const query = queryInfo.query.toLowerCase();

    if (queryInfo.type === "project") {
      return {
        ...queryInfo,
        mode,
        matches: projects
          .filter((project) => project.name.toLowerCase().startsWith(query))
          .map((project) => formatValueToken("project", project.name)),
      };
    }

    if (queryInfo.type === "tag") {
      return {
        ...queryInfo,
        mode,
        matches: tags
          .filter((tag) => tag.name.toLowerCase().startsWith(query))
          .map((tag) => formatValueToken("tag", tag.name)),
      };
    }

    if (queryInfo.type === "break") {
      const custom = /^\d+$/.test(query) ? `${query}d` : null;
      const values = [
        ...(custom ? [custom] : []),
        ...BREAK_SUGGESTIONS.filter((preset) => preset.startsWith(query) && preset !== custom),
      ];
      return {
        ...queryInfo,
        mode,
        matches: values.map((value) => formatValueToken("break", value)),
      };
    }

    if (queryInfo.type === "date") {
      return {
        ...queryInfo,
        mode,
        matches: DATE_SUGGESTIONS.filter((value) => value.startsWith(query)).map((value) =>
          formatValueToken("date", value),
        ),
      };
    }

    if (queryInfo.type === "recurrence") {
      return {
        ...queryInfo,
        mode,
        matches: RECURRENCE_SUGGESTIONS.filter((value) =>
          value.toLowerCase().startsWith(query),
        ).map((value) => formatValueToken("recurrence", value)),
      };
    }

    return {
      ...queryInfo,
      mode,
      matches: POLICY_SUGGESTIONS.filter((value) => value.startsWith(query)).map((value) =>
        formatValueToken("policy", value),
      ),
    };
  }

  function applySuggestion(input: string, suggestions: ReturnType<typeof getSuggestions>): string {
    if (!suggestions || suggestions.matches.length === 0) return input;
    const match = suggestions.matches[activeSuggestionIdx % suggestions.matches.length];
    const before = input.slice(0, suggestions.triggerIndex);
    setActiveSuggestionIdx(0);

    const suffix = suggestions.mode === "plain" || match.endsWith(":") ? "" : " ";
    return `${before}${match}${suffix}`;
  }

  return {
    activeSuggestionIdx,
    setActiveSuggestionIdx,
    getSuggestions,
    applySuggestion,
  };
}
