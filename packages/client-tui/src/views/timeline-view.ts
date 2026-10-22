import { ANSI } from "./theme.js";

export function renderTimelineViewLines(
  entries: Array<{
    id: string;
    projectId: string;
    projectName: string;
    content: string;
    tags: string[];
    createdAt: number;
  }>,
  selectedEntryIdx: number,
  icons: Record<string, string>,
  quickCaptureKey: string,
  filterQuery: string,
): string[] {
  const lines: string[] = [];
  if (entries.length === 0) {
    const msg = filterQuery
      ? `No notes matching filter "${filterQuery}". Press '/' or Esc to clear.`
      : `No journal notes yet. Press '${quickCaptureKey}' to create one!`;
    lines.push("", `  ${ANSI.dim}${msg}${ANSI.reset}`, "");
    return lines;
  }

  // Group by day
  const grouped = new Map<string, typeof entries>();
  for (const entry of entries) {
    const day = new Date(entry.createdAt).toISOString().slice(0, 10);
    if (!grouped.has(day)) grouped.set(day, []);
    grouped.get(day)!.push(entry);
  }

  let globalIdx = 0;
  for (const [day, dayEntries] of grouped.entries()) {
    lines.push(`${ANSI.bold}${ANSI.yellow}${icons.calendar} ${day}${ANSI.reset}`);

    for (const item of dayEntries) {
      const isSel = globalIdx === selectedEntryIdx;
      const border = isSel ? ANSI.cyan : ANSI.gray;
      const badge = isSel ? `${ANSI.bgCyan} SELECTED ${ANSI.reset}` : "";
      const time = new Date(item.createdAt).toTimeString().slice(0, 5);

      lines.push(
        `${border}┌──${ANSI.reset} ${badge} ${ANSI.dim}${time}${ANSI.reset} ` +
          `${ANSI.blue}${icons.project} @${item.projectName}${ANSI.reset} ` +
          item.tags.map((t) => `${ANSI.magenta}${icons.tag} #${t}${ANSI.reset}`).join(" "),
      );

      const contentLines = item.content.split("\n");
      for (const line of contentLines) {
        let formatted = line;
        if (line.startsWith("- [x]"))
          formatted = `${ANSI.green}${icons.checked}${ANSI.reset} ${line.slice(5)}`;
        else if (line.startsWith("- [ ]"))
          formatted = `${ANSI.gray}${icons.unchecked}${ANSI.reset} ${line.slice(5)}`;
        else if (line.startsWith("-"))
          formatted = `${ANSI.cyan}${icons.bullet}${ANSI.reset} ${line.slice(1)}`;
        lines.push(`${border}│${ANSI.reset}  ${formatted}`);
      }

      lines.push(`${border}└───${ANSI.reset}`);
      globalIdx++;
    }
    lines.push("");
  }
  return lines;
}
