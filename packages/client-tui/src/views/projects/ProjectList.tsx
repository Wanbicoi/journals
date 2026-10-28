import type { ScrollBoxRenderable } from "@opentui/core";
import { useEffect, useRef } from "react";
import { HighlightText } from "../../components/HighlightText.js";
import { useIcons } from "../../contexts/icons.js";
import { useNavigation } from "../../contexts/navigation.js";
import { useTheme } from "../../contexts/theme.js";
import type { Project } from "../../hooks/queries.js";

interface ProjectListProps {
  projects: Project[];
  selectedProjectIdx: number;
  onSelectProject: (idx: number) => void;
}

export function ProjectList({ projects, selectedProjectIdx, onSelectProject }: ProjectListProps) {
  const scrollBoxRef = useRef<ScrollBoxRenderable | null>(null);
  const icons = useIcons();
  const theme = useTheme();
  const { filter } = useNavigation();

  useEffect(() => {
    if (scrollBoxRef.current && projects[selectedProjectIdx]) {
      scrollBoxRef.current.scrollChildIntoView(`project-${projects[selectedProjectIdx].id}`);
    }
  }, [selectedProjectIdx, projects]);

  return (
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
        {projects.map((project, idx) => {
          const isSelected = idx === selectedProjectIdx;
          return (
            <box
              key={project.id}
              id={`project-${project.id}`}
              flexDirection="row"
              justifyContent="space-between"
              backgroundColor={isSelected ? theme.border : undefined}
              paddingLeft={1}
              paddingRight={1}
              onMouseDown={() => onSelectProject(idx)}
            >
              <box flexDirection="row">
                <text fg={isSelected ? theme.primary : theme.fg}>
                  {isSelected ? `${icons.pointer} ` : "  "}
                </text>
                <HighlightText
                  text={project.name}
                  query={filter}
                  theme={theme}
                  defaultFg={isSelected ? theme.primary : theme.fg}
                  selectable={false}
                />
              </box>
              <text fg={theme.muted}>{`(${project.entryCount})`}</text>
            </box>
          );
        })}
      </scrollbox>
    </box>
  );
}
