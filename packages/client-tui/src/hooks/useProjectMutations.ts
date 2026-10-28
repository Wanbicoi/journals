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
    missedPolicy: "accumulate" | "spike" | "mark_done" = "spike",
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
      missedPolicy?: "accumulate" | "spike" | "mark_done";
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

  return { createProject, updateProject, updateProjectContent };
}
