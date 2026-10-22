import React from "react";
import type { Entry, Project } from "../../hooks/useJournalData.js";
import type { ThemePalette } from "../../theme.js";

interface ProjectsViewProps {
  projects: Project[];
  selectedProjectIdx: number;
  entries: Entry[];
  width: number;
  icons: Record<string, string>;
  editKey: string;
  theme: ThemePalette;
}

export function ProjectsView({
  projects,
  selectedProjectIdx,
  entries,
  width,
  icons,
  editKey,
  theme,
}: ProjectsViewProps) {
  const selProj = projects[selectedProjectIdx] || {
    name: "None",
    content: "",
    entryCount: 0,
  };

  return (
    <box flexDirection="row" flexGrow={1}>
      {/* Projects List (Left Column) */}
      <box width={28} flexDirection="column">
        <text fg={theme.primary}>{`${icons.project} PROJECTS`}</text>
        <text fg={theme.border}>{"─".repeat(26)}</text>
        <scrollbox flexGrow={1}>
          {projects.map((p, idx) => {
            const isSel = idx === selectedProjectIdx;
            return (
              <box key={p.id}>
                {isSel ? (
                  <text
                    fg={theme.primary}
                    bg={theme.border}
                  >{`❯ ${p.name} (${p.entryCount})`}</text>
                ) : (
                  <text fg={theme.fg}>{`  ${p.name} (${p.entryCount})`}</text>
                )}
              </box>
            );
          })}
        </scrollbox>
      </box>

      <text fg={theme.border}>{"│ "}</text>

      {/* Project Details & Preview (Right Column) */}
      <box flexGrow={1} flexDirection="column">
        <text fg={theme.accent}>{`Preview: ${selProj.name} `}</text>
        <text fg={theme.muted}>{`[Press '${editKey}' to edit in $EDITOR]`}</text>
        <text fg={theme.border}>{"─".repeat(Math.max(10, width - 32))}</text>
        <scrollbox flexGrow={1}>
          {selProj.content.split("\n").map((line, lIdx) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: line-by-line render of markdown text
            <text key={lIdx} fg={line.startsWith("#") ? theme.primary : theme.fg}>
              {line}
            </text>
          ))}
          <text fg={theme.border}>{"─".repeat(Math.max(10, width - 32))}</text>
          <text fg={theme.muted}>{`Associated Notes in @${selProj.name}:`}</text>
          {entries
            .filter((e) => e.projectName.toLowerCase() === selProj.name.toLowerCase())
            .map((e) => (
              <text key={e.id} fg={theme.fg}>
                {`• ${new Date(e.createdAt).toISOString().slice(0, 10)} ${e.content.split("\n")[0]}`}
              </text>
            ))}
        </scrollbox>
      </box>
    </box>
  );
}
