import type { Entry, Project } from "./queries.js";

export function filterEntries(entries: Entry[], query: string): Entry[] {
  if (!query) return entries;
  const needle = query.toLowerCase();
  return entries.filter(
    (entry) =>
      entry.content.toLowerCase().includes(needle) ||
      entry.projectName?.toLowerCase().includes(needle) ||
      entry.tags.some((tag) => tag.toLowerCase().includes(needle)),
  );
}

export function filterProjects(projects: Project[], query: string): Project[] {
  if (!query) return projects;
  const needle = query.toLowerCase();
  return projects.filter(
    (project) =>
      project.name.toLowerCase().includes(needle) || project.content.toLowerCase().includes(needle),
  );
}
