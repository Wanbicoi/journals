import { useQueryClient } from "@tanstack/react-query";
import { client, config, restoreEntryApi } from "../api/client.js";
import { invalidateAfterMutation, invalidationKeys } from "./queries.js";

/**
 * Entry writes: one function per user intent, each ending in the invalidation scopes it touches.
 * Projects have their own hook; a caller takes only the slice it uses.
 */

export function useEntryMutations() {
  const queryClient = useQueryClient();

  // @unit journals.hooks.capture
  // @summary Capture a line into an entry
  async function quickCapture(content: string) {
    // @call journals.server.capture Parse and store the captured line
    const res = await client.capture.$post({
      json: {
        raw: content,
        defaultProject: config.quick_add.default_project,
      },
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? `Capture failed: ${res.statusText}`);
    }
    await invalidateAfterMutation(queryClient, invalidationKeys.capture);
  }

  // @unit journals.hooks.update-entry-project
  // @summary Move an entry to another project
  async function updateEntryProject(entryId: string, projectName: string) {
    // @call journals.server.update-entry-project Move the entry
    await client.entries[":id"].project.$patch({
      param: { id: entryId },
      json: { projectName },
    });
    await invalidateAfterMutation(queryClient, invalidationKeys.entryProject);
  }

  // @unit journals.hooks.update-entry-tags
  // @summary Replace an entry's tags
  async function updateEntryTags(entryId: string, newTags: string[]) {
    // @call journals.server.update-entry-tags Replace the entry's tags
    await client.entries[":id"].tags.$patch({
      param: { id: entryId },
      json: { tags: newTags },
    });
    await invalidateAfterMutation(queryClient, invalidationKeys.entryTags);
  }

  // @unit journals.hooks.update-entry-content
  // @summary Edit an entry's content
  async function updateEntryContent(entryId: string, content: string) {
    // @call journals.server.update-entry-content Save the entry's content
    await client.entries[":id"].content.$patch({
      param: { id: entryId },
      json: { content },
    });
    await invalidateAfterMutation(queryClient, invalidationKeys.entryContent);
  }

  // @unit journals.hooks.delete-entry
  // @summary Soft-delete an entry
  async function deleteEntry(entryId: string) {
    // @call journals.server.delete-entry Soft-delete the entry
    await client.entries[":id"].$delete({
      param: { id: entryId },
    });
    await invalidateAfterMutation(queryClient, invalidationKeys.entryDeleted);
  }

  // @unit journals.hooks.restore-entry
  // @summary Restore a deleted entry
  async function restoreEntry(entryId: string) {
    // @call journals.server.restore-entry Restore the entry
    await restoreEntryApi(entryId);
    await invalidateAfterMutation(queryClient, invalidationKeys.entryDeleted);
  }

  return {
    quickCapture,
    updateEntryProject,
    updateEntryTags,
    updateEntryContent,
    deleteEntry,
    restoreEntry,
  };
}
