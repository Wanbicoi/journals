import type { Project } from "../../hooks/queries.js";
import { useScopedKeymaps } from "../../hooks/useScopedKeymaps.js";

interface UseProjectsKeymapsOptions {
  projects: Project[];
  selectedProjectIdx: number;
  onSelectProject?: (idx: number) => void;
  onNewProject?: () => void;
  onEditProjectSettings?: (project: Project) => void;
  onEditProjectContent?: (project: Project) => void;
}

export function useProjectsKeymaps({
  projects,
  selectedProjectIdx,
  onSelectProject,
  onNewProject,
  onEditProjectSettings,
  onEditProjectContent,
}: UseProjectsKeymapsOptions) {
  const selected = projects[selectedProjectIdx];

  useScopedKeymaps("projects", {
    down: () =>
      onSelectProject?.(Math.min(selectedProjectIdx + 1, Math.max(0, projects.length - 1))),
    up: () => onSelectProject?.(Math.max(0, selectedProjectIdx - 1)),
    new_project: () => onNewProject?.(),
    edit_project_settings: () => selected && onEditProjectSettings?.(selected),
    edit_project_content: () => selected && onEditProjectContent?.(selected),
  });
}
