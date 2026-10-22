import { ANSI } from "./theme.js";

export function renderProjectsViewLines(
  projects: Array<{
    id: string;
    name: string;
    content: string;
    createdAt: number;
    entryCount: number;
  }>,
  allEntries: Array<{
    id: string;
    projectName: string;
    content: string;
    createdAt: number;
  }>,
  selectedProjectIdx: number,
  icons: Record<string, string>,
  editKey: string,
  width: number,
): string[] {
  const lines: string[] = [];
  const leftW = 28;
  const rightW = width - leftW - 3;
  const selProj = projects[selectedProjectIdx] || { name: "None", content: "", entryCount: 0 };

  const leftLines = [
    `${ANSI.bold}${ANSI.cyan}${icons.project} PROJECTS${ANSI.reset}`,
    `${ANSI.gray}${"─".repeat(leftW - 2)}${ANSI.reset}`,
  ];

  projects.forEach((p, idx) => {
    const isSel = idx === selectedProjectIdx;
    const text = `${p.name} (${p.entryCount})`;
    if (isSel) {
      leftLines.push(`${ANSI.inverse}${ANSI.cyan}❯ ${text.padEnd(leftW - 4)}${ANSI.reset}`);
    } else {
      leftLines.push(`  ${text}`);
    }
  });

  const rightLines = [
    `${ANSI.bold}${ANSI.yellow}Preview: ${selProj.name}${ANSI.reset} ${ANSI.dim}[Press '${editKey}' to edit in $EDITOR]${ANSI.reset}`,
    `${ANSI.gray}${"─".repeat(rightW)}${ANSI.reset}`,
    ...selProj.content.split("\n").map((l) => {
      if (l.startsWith("#")) return `${ANSI.bold}${ANSI.cyan}${l}${ANSI.reset}`;
      if (l.startsWith("- [x]")) return `${ANSI.green}${icons.checked}${ANSI.reset} ${l.slice(5)}`;
      if (l.startsWith("- [ ]")) return `${ANSI.gray}${icons.unchecked}${ANSI.reset} ${l.slice(5)}`;
      if (l.startsWith("-")) return `${ANSI.cyan}${icons.bullet}${ANSI.reset} ${l.slice(1)}`;
      return l;
    }),
    "",
    `${ANSI.gray}${"─".repeat(rightW)}${ANSI.reset}`,
    `${ANSI.dim}Associated Notes in @${selProj.name}:${ANSI.reset}`,
    ...allEntries
      .filter((e) => e.projectName.toLowerCase() === selProj.name.toLowerCase())
      .map(
        (e) =>
          `• ${ANSI.gray}${new Date(e.createdAt).toISOString().slice(0, 10)}${ANSI.reset} ${e.content.split("\n")[0].slice(0, rightW - 25)}`,
      ),
  ];

  const maxRows = Math.max(leftLines.length, rightLines.length, 12);
  for (let i = 0; i < maxRows; i++) {
    const left = (leftLines[i] || "").padEnd(leftW);
    const right = rightLines[i] || "";
    lines.push(`${left} ${ANSI.gray}│${ANSI.reset} ${right}`);
  }
  return lines;
}
