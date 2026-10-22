import type { ScrollBoxRenderable } from "@opentui/core";
import React, { useEffect, useRef } from "react";
import type { Entry, Project } from "../../hooks/useJournalData.js";
import type { ThemePalette } from "../../theme.js";

interface ProjectsViewProps {
  projects: Project[];
  selectedProjectIdx: number;
  onSelectProject?: (idx: number) => void;
  entries: Entry[];
  width: number;
  icons: Record<string, string>;
  theme: ThemePalette;
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto", style: "narrow" });

function formatRelativeTime(dateInput: number | string | Date): string {
  const diffSec = Math.round((new Date(dateInput).getTime() - Date.now()) / 1000);
  if (Math.abs(diffSec) < 45) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
  const diffHour = Math.round(diffMin / 60);
  if (Math.abs(diffHour) < 24) return rtf.format(diffHour, "hour");
  const diffDay = Math.round(diffHour / 24);
  if (Math.abs(diffDay) < 30) return rtf.format(diffDay, "day");
  const diffMonth = Math.round(diffDay / 30);
  if (Math.abs(diffMonth) < 12) return rtf.format(diffMonth, "month");
  const diffYear = Math.round(diffDay / 365);
  return rtf.format(diffYear, "year");
}

export function ProjectsView({
  projects,
  selectedProjectIdx,
  onSelectProject,
  entries,
  width,
  icons,
  theme,
}: ProjectsViewProps) {
  const scrollBoxRef = useRef<ScrollBoxRenderable | null>(null);

  useEffect(() => {
    if (scrollBoxRef.current && projects[selectedProjectIdx]) {
      const selectedId = `project-${projects[selectedProjectIdx].id}`;
      scrollBoxRef.current.scrollChildIntoView(selectedId);
    }
  }, [selectedProjectIdx, projects]);

  const selProj = projects[selectedProjectIdx] || {
    name: "None",
    content: "",
    entryCount: 0,
  };

  const projectNotes = entries.filter(
    (e) => e.projectName.toLowerCase() === selProj.name.toLowerCase(),
  );

  return (
    <box flexDirection="row" flexGrow={1} paddingLeft={1} paddingRight={1}>
      {/* Projects List (Left Column) */}
      <box
        width={30}
        flexDirection="column"
        borderStyle="single"
        borderColor={theme.border}
        paddingLeft={1}
        paddingRight={1}
        marginRight={1}
      >
        <box flexDirection="row" marginBottom={1}>
          <text fg={theme.primary}>{`${icons.project} PROJECTS (${projects.length})`}</text>
        </box>
        <scrollbox ref={scrollBoxRef} flexGrow={1}>
          {projects.map((p, idx) => {
            const isSel = idx === selectedProjectIdx;
            return (
              <box
                key={p.id}
                id={`project-${p.id}`}
                flexDirection="row"
                justifyContent="space-between"
                backgroundColor={isSel ? theme.border : undefined}
                paddingLeft={1}
                paddingRight={1}
                onMouseDown={() => {
                  onSelectProject?.(idx);
                }}
              >
                <text fg={isSel ? theme.primary : theme.fg}>
                  {`${isSel ? "❯ " : "  "}${p.name}`}
                </text>
                <text fg={theme.muted}>{`(${p.entryCount})`}</text>
              </box>
            );
          })}
        </scrollbox>
      </box>

      {/* Project Details & Preview (Right Column) */}
      <box flexGrow={1} flexDirection="column">
        {/* Right Header: Project details banner */}
        <box flexDirection="row" justifyContent="space-between" marginBottom={1}>
          <box flexDirection="row">
            <text fg={theme.secondary}>{`${icons.project} @${selProj.name}`}</text>
            <text
              fg={theme.muted}
            >{` • ${projectNotes.length} associated note${projectNotes.length === 1 ? "" : "s"}`}</text>
          </box>
        </box>

        <scrollbox flexGrow={1}>
          {/* Project Markdown / Description */}
          <box
            flexDirection="column"
            borderStyle="single"
            borderColor={theme.border}
            paddingLeft={1}
            paddingRight={1}
            paddingTop={0}
            paddingBottom={0}
            marginBottom={1}
          >
            {selProj.content ? (
              selProj.content.split("\n").map((line, lIdx) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: line-by-line render of markdown text
                <text key={lIdx} fg={line.startsWith("#") ? theme.primary : theme.fg} selectable>
                  {line || " "}
                </text>
              ))
            ) : (
              <text fg={theme.muted}>{"No project overview notes."}</text>
            )}
          </box>

          {/* Associated Notes Section */}
          <box flexDirection="row" marginTop={1}>
            <text fg={theme.accent}>{`${icons.journal || "📝"} Associated Notes`}</text>
          </box>

          {projectNotes.length === 0 ? (
            <text fg={theme.muted}>{"  No notes logged under this project yet."}</text>
          ) : (
            projectNotes.map((e) => (
              <box
                key={e.id}
                flexDirection="column"
                borderStyle="single"
                borderColor={theme.border}
                paddingLeft={1}
                paddingRight={1}
              >
                <box flexDirection="row" justifyContent="space-between">
                  <box flexDirection="row">
                    <text
                      fg={theme.muted}
                    >{`${formatRelativeTime(e.createdAt)} • ${new Date(e.createdAt).toISOString().slice(0, 10)} ${new Date(e.createdAt).toTimeString().slice(0, 5)} `}</text>
                    {e.tags.map((t) => (
                      <text key={t} fg={theme.tag}>{`#${t} `}</text>
                    ))}
                  </box>
                </box>
                <text fg={theme.fg} selectable>
                  {e.content}
                </text>
              </box>
            ))
          )}
        </scrollbox>
      </box>
    </box>
  );
}
