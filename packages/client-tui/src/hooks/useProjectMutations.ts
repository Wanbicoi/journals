import type { ProjectMissedPolicy } from "@journals/core";
import { useQueryClient } from "@tanstack/react-query";
import { client, updateProjectApi } from "../api/client.js";
import { invalidateAfterMutation, invalidationKeys } from "./queries.js";

/**
 * Project writes. Kept apart from entry writes so a screen that only edits a project does not
 * depend on the entry slice.
 */

export function useProjectMutations() {
  const queryClient = useQueryClient();

  // @unit journals.hooks.create-project
  // @summary Create a project
  async function createProject(
    name: string,
    recurrence: string | null = null,
    missedPolicy: ProjectMissedPolicy = "spike",
  ) {
    // @call journals.server.create-project Create the project
    await client.projects.$post({
      json: {
        name,
        content: `# Project: ${name}\n\nCreated: ${new Date().toISOString()}`,
        recurrence,
        missedPolicy,
      },
    });
    await invalidateAfterMutation(queryClient, invalidationKeys.projectCreated);
  }

  // @unit journals.hooks.update-project
  // @summary Edit a project's name, recurrence, and policy
  async function updateProject(
    id: string,
    data: {
      name?: string;
      content?: string;
      recurrence?: string | null;
      missedPolicy?: ProjectMissedPolicy;
    },
  ) {
    // @call journals.server.update-project Save the project's name, recurrence, and policy
    await updateProjectApi(id, data);
    await invalidateAfterMutation(queryClient, invalidationKeys.projectUpdated);
  }

  // @unit journals.hooks.update-project-content
  // @summary Edit a project document
  async function updateProjectContent(id: string, content: string) {
    // @call journals.server.update-project Save the project document
    await client.projects[":id"].content.$patch({
      param: { id },
      json: { content },
    });
    await invalidateAfterMutation(queryClient, invalidationKeys.projectContent);
  }

  // @unit journals.hooks.delete-project
  // @summary Soft-delete a project
  async function deleteProject(id: string) {
    // @call journals.server.delete-project Soft-delete the project and hide its entries
    await client.projects[":id"].$delete({ param: { id } });
    await invalidateAfterMutation(queryClient, invalidationKeys.projectDeleted);
  }

  return { createProject, updateProject, updateProjectContent, deleteProject };
}
