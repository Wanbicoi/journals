import { useMemo } from "react";
import { ErrorState } from "../../components/ErrorState.js";
import { useModals } from "../../contexts/modals.js";
import { useNavigation } from "../../contexts/navigation.js";
import { useTheme } from "../../contexts/theme.js";
import { filterProjects } from "../../hooks/filterJournal.js";
import type { Entry, Project } from "../../hooks/queries.js";
import { useEntries, useProjects } from "../../hooks/queries.js";
import { useEditInEditor } from "../../hooks/useEditInEditor.js";
import { useProjectMutations } from "../../hooks/useProjectMutations.js";
import { useSelectionById } from "../../hooks/useSelection.js";
import { ProjectDetail } from "./ProjectDetail.js";
import { ProjectList } from "./ProjectList.js";
import { useProjectsKeymaps } from "./useProjectsKeymaps.js";

// @unit journals.views.projects
// @summary Projects view: list, create, edit content
// @details Loads its own projects and entries, owns its selection, and opens the project modals
// | through context. The editor workflow is one action owned here.
export function ProjectsView() {
  const theme = useTheme();
  const { filter } = useNavigation();
  const { open } = useModals();
  const { updateProjectContent } = useProjectMutations();
  const editInEditor = useEditInEditor();

  // @call journals.hooks.projects Load the project list
  const { data: projects = [], isLoading, isError, error, refetch } = useProjects();
  // @call journals.hooks.entries Load the entries shown under each project
  const { data: entries = [] } = useEntries();
  // @call journals.hooks.filter-projects Filter projects by the search query
  const filteredProjects = useMemo(() => filterProjects(projects, filter), [projects, filter]);
  // @call journals.hooks.selection Keep the selected project by id
  const selection = useSelectionById(filteredProjects);

  const editProjectContent = async (project: Project) => {
    await editInEditor(
      project.content,
      (content) => updateProjectContent(project.id, content),
      `Updated content for @${project.name}`,
    );
  };

  useProjectsKeymaps({
    projects: filteredProjects,
    selectedProjectIdx: selection.selectedIndex,
    onSelectProject: selection.selectIndex,
    // @call journals.contexts.modals Open the new project modal
    onNewProject: () => open({ name: "new-project" }),
    // @call journals.contexts.modals Open the project settings modal
    onEditProjectSettings: (project) => open({ name: "edit-project-settings", project }),
    // @call journals.actions.edit-in-editor Edit the selected project in $EDITOR
    onEditProjectContent: (project) => void editProjectContent(project),
  });

  if (isError) {
    // @call journals.views.error-state Show a load error and offer a retry
    return <ErrorState error={error} onRetry={refetch} />;
  }

  if (isLoading) {
    return (
      <box padding={1}>
        <text fg={theme.muted}>{"Loading your projects..."}</text>
      </box>
    );
  }

  const selectedProject = filteredProjects[selection.selectedIndex];
  const projectNotes: Entry[] = selectedProject
    ? entries.filter(
        (entry) =>
          !!entry.projectName &&
          entry.projectName.toLowerCase() === selectedProject.name.toLowerCase(),
      )
    : [];

  return (
    <box flexDirection="row" flexGrow={1} paddingLeft={1} paddingRight={1}>
      <ProjectList
        projects={filteredProjects}
        selectedProjectIdx={selection.selectedIndex}
        onSelectProject={selection.selectIndex}
      />
      <ProjectDetail
        projectName={selectedProject?.name ?? "None"}
        content={selectedProject?.content ?? ""}
        notes={projectNotes}
      />
    </box>
  );
}
