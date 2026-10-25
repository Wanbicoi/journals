import { useKeyboard } from "@opentui/react";
import { useKeymaps } from "../../contexts/keymaps.js";
import { openExternalEditor } from "../../editor.js";
import type { Project } from "../../hooks/useJournalData.js";
import { matchesAnyBinding, matchesBinding } from "../../keymap.js";

interface UseProjectsKeymapsOptions {
  projects: Project[];
  selectedProjectIdx: number;
  isActive: boolean;
  onSelectProject?: (idx: number) => void;
  onStatusMessage?: (msg: string) => void;
  onNewProject?: () => void;
  onEditProjectSettings?: (project: Project) => void;
  onOpenEditor?: (project: Project) => void;
  onUpdateProjectContent?: (id: string, content: string) => Promise<void> | void;
}

export function useProjectsKeymaps({
  projects,
  selectedProjectIdx,
  isActive,
  onSelectProject,
  onStatusMessage,
  onNewProject,
  onEditProjectSettings,
  onOpenEditor,
  onUpdateProjectContent,
}: UseProjectsKeymapsOptions) {
  const keymaps = useKeymaps();

  useKeyboard(async (key) => {
    if (!isActive) return;

    // Navigation: j/k, down/up
    if (matchesAnyBinding(key, "j", "down", keymaps.down)) {
      onSelectProject?.(Math.min(selectedProjectIdx + 1, Math.max(0, projects.length - 1)));
    } else if (matchesAnyBinding(key, "k", "up", keymaps.up)) {
      onSelectProject?.(Math.max(0, selectedProjectIdx - 1));
    } else if (matchesAnyBinding(key, "n", keymaps.new_project)) {
      onNewProject?.();
    } else if (matchesBinding(key, "P") || (key.shift && (key.name === "p" || key.name === "P"))) {
      const project = projects[selectedProjectIdx];
      if (project) {
        onEditProjectSettings?.(project);
      }
    } else if (matchesAnyBinding(key, "o", "e", keymaps.edit_project_content)) {
      const project = projects[selectedProjectIdx];
      if (project) {
        if (onOpenEditor) {
          onOpenEditor(project);
        } else if (onUpdateProjectContent) {
          const updated = openExternalEditor(project.content);
          if (updated !== project.content) {
            await onUpdateProjectContent(project.id, updated);
            onStatusMessage?.(`Updated content for @${project.name}`);
          }
        }
      }
    }
  });
}
