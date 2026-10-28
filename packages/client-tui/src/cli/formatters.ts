import type { AgentEntryDetail } from "@journals/core";

// @unit journals.cli.format-entry
// @summary Format the entry detail
// @returns A fixed-width block with metadata, links, and the full history
export function formatEntryDetail(entry: AgentEntryDetail): string {
  const hitLines =
    entry.hitLogs.length === 0
      ? ["  (none)"]
      : entry.hitLogs.map((log) => `  ${new Date(log.createdAt).toISOString()}  ${log.content}`);

  return [
    "======================================================================",
    `ID:             ${entry.id}`,
    `Project:        ${entry.projectName || "None"}`,
    `Hit count:      ${entry.hitCount}`,
    `Previous:       ${entry.previousEntryId ?? "(none)"}`,
    `Superseded by:  ${entry.supersededByEntryId ?? "(none)"}`,
    `Created:        ${new Date(entry.createdAt).toISOString()}`,
    `Updated:        ${new Date(entry.updatedAt).toISOString()}`,
    "----------------------------------------------------------------------",
    entry.content,
    "----------------------------------------------------------------------",
    "Hit log:",
    ...hitLines,
    "======================================================================\n",
  ].join("\n");
}
