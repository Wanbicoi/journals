import { type StyleDefinitionInput, SyntaxStyle } from "@opentui/core";
import { useRenderer } from "@opentui/react";
import { useEffect, useMemo } from "react";
import type { ThemePalette } from "../theme.js";

export function buildMarkdownStyleDefinitions(
  theme: ThemePalette,
): Record<string, StyleDefinitionInput> {
  return {
    default: { fg: theme.fg },
    "markup.heading": { fg: theme.primary, bold: true },
    "markup.heading.1": { fg: theme.primary, bold: true },
    "markup.heading.2": { fg: theme.secondary, bold: true },
    "markup.heading.3": { fg: theme.accent, bold: true },
    "markup.heading.4": { fg: theme.primary, bold: true },
    "markup.heading.5": { fg: theme.secondary, bold: true },
    "markup.heading.6": { fg: theme.accent, bold: true },
    "markup.list": { fg: theme.accent },
    "markup.bold": { fg: theme.fg, bold: true },
    "markup.strong": { fg: theme.fg, bold: true },
    "markup.italic": { fg: theme.fg, italic: true },
    "markup.strikethrough": { dim: true },
    "markup.raw": { fg: theme.tag },
    "markup.raw.inline": { fg: theme.tag },
    "markup.raw.block": { fg: theme.fg },
    "markup.quote": { fg: theme.muted, italic: true },
    "markup.link": { fg: theme.secondary },
    "markup.link.label": { fg: theme.primary, underline: true },
    "markup.link.url": { fg: theme.muted, underline: true },
    conceal: { fg: theme.border },
    keyword: { fg: theme.primary, bold: true },
    string: { fg: theme.secondary },
    comment: { fg: theme.muted, italic: true },
    number: { fg: theme.accent },
    function: { fg: theme.primary },
    type: { fg: theme.accent },
    variable: { fg: theme.fg },
    operator: { fg: theme.muted },
  };
}

export function useMarkdownSyntaxStyle(theme: ThemePalette): SyntaxStyle {
  const renderer = useRenderer();

  const syntaxStyle = useMemo(() => {
    return SyntaxStyle.fromStyles(buildMarkdownStyleDefinitions(theme), renderer.nativeScene);
  }, [theme, renderer]);

  useEffect(() => {
    return () => {
      syntaxStyle.destroy();
    };
  }, [syntaxStyle]);

  return syntaxStyle;
}
