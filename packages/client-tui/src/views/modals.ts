import { ANSI } from "./theme.js";

export function renderCaptureModalLines(
  inputBuffer: string,
  suggestions: { type: "project" | "tag"; matches: string[] } | null,
  activeSuggestionIdx: number,
  icons: Record<string, string>,
  width: number,
): string[] {
  const modalW = Math.min(Math.max(68, Math.floor(width * 0.7)), width - 4);
  const leftPad = " ".repeat(Math.max(2, Math.floor((width - modalW) / 2)));
  const innerW = modalW - 4;

  const topBorder = `${leftPad}${ANSI.bgCyan}\x1b[30m ${icons.quick} QUICK CAPTURE ${" ".repeat(modalW - 17)}${ANSI.reset}`;
  const syntaxLine =
    `${leftPad}${ANSI.cyan}│${ANSI.reset} ${ANSI.dim}Syntax: Text ${ANSI.blue}@project${ANSI.reset} ${ANSI.magenta}#tags${ANSI.reset}${ANSI.dim}   [Tab: accept suggestions]${ANSI.reset}`.padEnd(
      modalW + 15,
    );

  const inputDisplay = `> ${inputBuffer}█`;
  const inputPad = Math.max(0, innerW - inputBuffer.length - 2);
  const inputLine = `${leftPad}${ANSI.cyan}│${ANSI.reset} ${ANSI.bold}${inputDisplay}${ANSI.reset}${" ".repeat(inputPad)} ${ANSI.cyan}│${ANSI.reset}`;

  const res = [
    `${leftPad}${ANSI.cyan}┌${"─".repeat(modalW - 2)}┐${ANSI.reset}`,
    topBorder,
    syntaxLine,
    inputLine,
  ];

  if (suggestions && suggestions.matches.length > 0) {
    const pills = suggestions.matches
      .slice(0, 4)
      .map((m, idx) => {
        const isSel = idx === activeSuggestionIdx;
        const prefix = suggestions.type === "project" ? "@" : "#";
        return isSel
          ? `${ANSI.inverse}[${prefix}${m}]${ANSI.reset}`
          : `${ANSI.dim}${prefix}${m}${ANSI.reset}`;
      })
      .join(" ");
    res.push(
      `${leftPad}${ANSI.cyan}│${ANSI.reset} ${ANSI.yellow}Suggestions:${ANSI.reset} ${pills}`,
    );
  }

  res.push(
    `${leftPad}${ANSI.cyan}│${ANSI.reset} ${ANSI.dim}[Enter: Save note]  [Esc: Cancel]${ANSI.reset}`,
    `${leftPad}${ANSI.cyan}└${"─".repeat(modalW - 2)}┘${ANSI.reset}`,
  );
  return res;
}

export function renderNewProjectModalLines(
  inputBuffer: string,
  icons: Record<string, string>,
): string[] {
  return [
    `${ANSI.cyan}┌─ ${icons.project} CREATE NEW PROJECT ──────────────────────────────────────────┐${ANSI.reset}`,
    `${ANSI.cyan}│${ANSI.reset} Project Name: ${ANSI.bold}${inputBuffer}█${ANSI.reset}`,
    `${ANSI.cyan}│${ANSI.reset} ${ANSI.dim}Press Enter to create, Esc to cancel${ANSI.reset}`,
    `${ANSI.cyan}└──────────────────────────────────────────────────────────────┘${ANSI.reset}`,
  ];
}

export function renderFilterModalLines(inputBuffer: string): string[] {
  return [
    `${ANSI.yellow}┌─ / FILTER & SEARCH ──────────────────────────────────────────┐${ANSI.reset}`,
    `${ANSI.yellow}│${ANSI.reset} Query: ${ANSI.bold}${inputBuffer}█${ANSI.reset}`,
    `${ANSI.yellow}│${ANSI.reset} ${ANSI.dim}Matches notes, project names, or tags. Enter to apply, Esc to clear${ANSI.reset}`,
    `${ANSI.yellow}└──────────────────────────────────────────────────────────────┘${ANSI.reset}`,
  ];
}

export function renderHelpModalLines(): string[] {
  return [
    `${ANSI.cyan}┌─ ? KEYBOARD SHORTCUTS & HELP ─────────────────────────────────┐${ANSI.reset}`,
    `${ANSI.cyan}│${ANSI.reset}  ${ANSI.bold}[1]${ANSI.reset}           Switch to Daily Timeline Stream View         ${ANSI.cyan}│${ANSI.reset}`,
    `${ANSI.cyan}│${ANSI.reset}  ${ANSI.bold}[2]${ANSI.reset}           Switch to Projects & Markdown Preview View   ${ANSI.cyan}│${ANSI.reset}`,
    `${ANSI.cyan}│${ANSI.reset}  ${ANSI.bold}[j / k]${ANSI.reset}       Navigate entries / projects up and down      ${ANSI.cyan}│${ANSI.reset}`,
    `${ANSI.cyan}│${ANSI.reset}  ${ANSI.bold}[n]${ANSI.reset}           1-Line Quick Capture (Syntax: @proj #tag)    ${ANSI.cyan}│${ANSI.reset}`,
    `${ANSI.cyan}│${ANSI.reset}  ${ANSI.bold}[N]${ANSI.reset}           Create new project                           ${ANSI.cyan}│${ANSI.reset}`,
    `${ANSI.cyan}│${ANSI.reset}  ${ANSI.bold}[p]${ANSI.reset}           Reassign project for selected note           ${ANSI.cyan}│${ANSI.reset}`,
    `${ANSI.cyan}│${ANSI.reset}  ${ANSI.bold}[t]${ANSI.reset}           Edit tags for selected note                  ${ANSI.cyan}│${ANSI.reset}`,
    `${ANSI.cyan}│${ANSI.reset}  ${ANSI.bold}[e]${ANSI.reset}           Edit project markdown content in $EDITOR     ${ANSI.cyan}│${ANSI.reset}`,
    `${ANSI.cyan}│${ANSI.reset}  ${ANSI.bold}[/]${ANSI.reset}           Search / filter stream or projects           ${ANSI.cyan}│${ANSI.reset}`,
    `${ANSI.cyan}│${ANSI.reset}  ${ANSI.bold}[Tab]${ANSI.reset}         Accept auto-suggestions when typing          ${ANSI.cyan}│${ANSI.reset}`,
    `${ANSI.cyan}│${ANSI.reset}  ${ANSI.bold}[Ctrl+W]${ANSI.reset}      Delete previous word in input fields         ${ANSI.cyan}│${ANSI.reset}`,
    `${ANSI.cyan}│${ANSI.reset}  ${ANSI.bold}[Ctrl+U]${ANSI.reset}      Clear entire input line                      ${ANSI.cyan}│${ANSI.reset}`,
    `${ANSI.cyan}│${ANSI.reset}  ${ANSI.bold}[Esc]${ANSI.reset}         Cancel prompt / Clear active filter          ${ANSI.cyan}│${ANSI.reset}`,
    `${ANSI.cyan}│${ANSI.reset}  ${ANSI.bold}[q]${ANSI.reset}           Quit application                             ${ANSI.cyan}│${ANSI.reset}`,
    `${ANSI.cyan}│${ANSI.reset} ${ANSI.dim}Press any key or Esc to dismiss${ANSI.reset}`,
    `${ANSI.cyan}└──────────────────────────────────────────────────────────────┘${ANSI.reset}`,
  ];
}

export function renderEditProjectPromptLines(
  currentProject: string,
  inputBuffer: string,
  projects: Array<{ name: string }>,
): string[] {
  const res = [
    `${ANSI.blue}┌─ Reassign Project [Current: @${currentProject}] ────────────────────────┐${ANSI.reset}`,
    `${ANSI.blue}│${ANSI.reset} Project: @${ANSI.bold}${inputBuffer}█${ANSI.reset}   [Tab for suggestion]`,
  ];
  const suggestions = projects
    .filter((p) => p.name.toLowerCase().startsWith(inputBuffer.toLowerCase()))
    .map((p) => p.name);
  if (suggestions.length > 0) {
    res.push(`${ANSI.blue}│${ANSI.reset} Suggestions: ${suggestions.slice(0, 5).join(", ")}`);
  }
  res.push(
    `${ANSI.blue}└──────────────────────────────────────────────────────────────┘${ANSI.reset}`,
  );
  return res;
}

export function renderEditTagsPromptLines(currentTags: string, inputBuffer: string): string[] {
  return [
    `${ANSI.magenta}┌─ Edit Tags [Current: ${currentTags}] ───────────────────────────────┐${ANSI.reset}`,
    `${ANSI.magenta}│${ANSI.reset} Tags: ${ANSI.bold}${inputBuffer}█${ANSI.reset}   [Comma-separated, Tab for suggestion]`,
    `${ANSI.magenta}└──────────────────────────────────────────────────────────────┘${ANSI.reset}`,
  ];
}
