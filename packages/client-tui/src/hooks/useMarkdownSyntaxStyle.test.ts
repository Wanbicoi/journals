import { describe, expect, it } from "bun:test";
import { themes } from "../theme.js";
import { buildMarkdownStyleDefinitions } from "./useMarkdownSyntaxStyle.js";

describe("buildMarkdownStyleDefinitions", () => {
  const theme = themes["rose-pine-moon"];

  it("configures theme palette styles for markdown headings", () => {
    const styles = buildMarkdownStyleDefinitions(theme);
    expect(styles["markup.heading"]).toEqual({
      fg: theme.primary,
      bold: true,
    });
    expect(styles["markup.heading.1"]).toEqual({
      fg: theme.primary,
      bold: true,
    });
    expect(styles["markup.heading.2"]).toEqual({
      fg: theme.secondary,
      bold: true,
    });
    expect(styles["markup.heading.3"]).toEqual({
      fg: theme.accent,
      bold: true,
    });
  });

  it("configures theme palette styles for lists, code, and quotes", () => {
    const styles = buildMarkdownStyleDefinitions(theme);
    expect(styles["markup.list"]).toEqual({ fg: theme.accent });
    expect(styles["markup.raw"]).toEqual({ fg: theme.tag });
    expect(styles["markup.quote"]).toEqual({ fg: theme.muted, italic: true });
  });

  it("configures base text and code block token styles", () => {
    const styles = buildMarkdownStyleDefinitions(theme);
    expect(styles.default).toEqual({ fg: theme.fg });
    expect(styles.keyword).toEqual({ fg: theme.primary, bold: true });
    expect(styles.string).toEqual({ fg: theme.secondary });
    expect(styles.comment).toEqual({ fg: theme.muted, italic: true });
    expect(styles.number).toEqual({ fg: theme.accent });
  });
});
