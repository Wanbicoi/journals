import { useEffect, useState } from "react";
import { client, config, fetchEntries, fetchProjects, fetchTags } from "../api/client.js";

export interface Entry {
  id: string;
  projectId: string;
  projectName: string;
  content: string;
  tags: string[];
  createdAt: number;
}

export interface Project {
  id: string;
  name: string;
  content: string;
  createdAt: number;
  entryCount: number;
}

export interface TagInfo {
  name: string;
  count: number;
}

export function useJournalData() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<TagInfo[]>([]);
  const [loading, setLoading] = useState(true);

  async function reloadData() {
    try {
      const [entriesData, projectsData, tagsData] = await Promise.all([
        fetchEntries(),
        fetchProjects(),
        fetchTags(),
      ]);
      setEntries(entriesData || []);
      setProjects(projectsData || []);
      setTags(tagsData || []);
    } finally {
      setLoading(false);
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: initial fetch on mount
  useEffect(() => {
    reloadData();
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: background polling
  useEffect(() => {
    const timer = setInterval(() => {
      reloadData();
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  async function quickCapture(content: string) {
    await client.capture.$post({
      json: {
        raw: content,
        defaultProject: config.defaults.project,
        defaultTags: config.defaults.tags,
      },
    });
    await reloadData();
  }

  async function createProject(name: string) {
    await client.projects.$post({
      json: {
        name,
        content: `# Project: ${name}\n\nCreated: ${new Date().toISOString()}`,
      },
    });
    await reloadData();
  }

  async function updateProjectContent(id: string, content: string) {
    await client.projects[":id"].content.$patch({
      param: { id },
      json: { content },
    });
    await reloadData();
  }

  async function updateEntryProject(entryId: string, projectName: string) {
    await client.entries[":id"].project.$patch({
      param: { id: entryId },
      json: { projectName },
    });
    await reloadData();
  }

  async function updateEntryTags(entryId: string, newTags: string[]) {
    await client.entries[":id"].tags.$patch({
      param: { id: entryId },
      json: { tags: newTags },
    });
    await reloadData();
  }

  async function updateEntryContent(entryId: string, content: string) {
    await client.entries[":id"].content.$patch({
      param: { id: entryId },
      json: { content },
    });
    await reloadData();
  }

  async function deleteEntry(entryId: string) {
    await client.entries[":id"].$delete({
      param: { id: entryId },
    });
    await reloadData();
  }

  return {
    entries,
    projects,
    tags,
    loading,
    reloadData,
    quickCapture,
    createProject,
    updateProjectContent,
    updateEntryProject,
    updateEntryTags,
    updateEntryContent,
    deleteEntry,
  };
}
