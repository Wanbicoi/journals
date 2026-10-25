import type { Entry, Project } from "../../hooks/useJournalData.js";
import { ProjectDetail } from "./ProjectDetail.js";
import { ProjectList } from "./ProjectList.js";
import { useProjectsKeymaps } from "./useProjectsKeymaps.js";

interface ProjectsViewProps {
  projects: Project[];
  selectedProjectIdx: number;
  onSelectProject?: (idx: number) => void;
  entries: Entry[];
  filterQuery?: string;
  isActive?: boolean;
  onStatusMessage?: (msg: string) => void;
  onNewProject?: () => void;
  onEditProjectSettings?: (project: Project) => void;
  onOpenEditor?: (project: Project) => void;
  onUpdateProjectContent?: (id: string, content: string) => Promise<void> | void;
}

export function ProjectsView({
  projects,
  selectedProjectIdx,
  onSelectProject,
  entries,
  filterQuery = "",
  isActive = true,
  onStatusMessage,
  onNewProject,
  onEditProjectSettings,
  onOpenEditor,
  onUpdateProjectContent,
}: ProjectsViewProps) {
  useProjectsKeymaps({
    projects,
    selectedProjectIdx,
    isActive,
    onSelectProject,
    onStatusMessage,
    onNewProject,
    onEditProjectSettings,
    onOpenEditor,
    onUpdateProjectContent,
  });

  const selectedProject = projects[selectedProjectIdx];
  const projectNotes = selectedProject
    ? entries.filter(
        (entry) =>
          !!entry.projectName &&
          entry.projectName.toLowerCase() === selectedProject.name.toLowerCase(),
      )
    : [];

  return (
    <box flexDirection="row" flexGrow={1} paddingLeft={1} paddingRight={1}>
      <ProjectList
        projects={projects}
        selectedProjectIdx={selectedProjectIdx}
        filterQuery={filterQuery}
        onSelectProject={onSelectProject ?? (() => {})}
      />
      <ProjectDetail
        projectName={selectedProject?.name ?? "None"}
        content={selectedProject?.content ?? ""}
        notes={projectNotes}
      />
    </box>
  );
}
