// @unit journals.cli.format-entry
// @summary Format the entry detail
// @returns A fixed-width block with metadata and the full note
export function formatEntryDetail(entry: {
  id: string;
  projectName?: string;
  hitTime: number;
  createdAt: number;
  updatedAt: number;
  content: string;
}): string {
  return [
    "======================================================================",
    `ID:        ${entry.id}`,
    `Project:   ${entry.projectName || "None"}`,
    `Hit count: ${entry.hitTime}`,
    `Created:   ${new Date(entry.createdAt).toISOString()}`,
    `Updated:   ${new Date(entry.updatedAt).toISOString()}`,
    "----------------------------------------------------------------------",
    entry.content,
    "======================================================================\n",
  ].join("\n");
}
