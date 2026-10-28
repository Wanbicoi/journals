import { type ProjectMissedPolicy, normalizeRecurrenceRule } from "@journals/core";

export interface ProjectSpec {
  name: string;
  /** `undefined` when the input said nothing, `null` when it asked to clear the routine. */
  recurrence: string | null | undefined;
  missedPolicy: ProjectMissedPolicy | undefined;
}

/**
 * The slash syntax a project row accepts: `Reading /every weekday /policy:accumulate`. Pure, so
 * both the create and the settings modal share one parser and the preview cannot drift from the
 * value that gets saved.
 */

// @unit journals.hooks.project-spec
// @summary Parse a project name, recurrence, and missed policy
export function parseProjectSpec(raw: string): ProjectSpec {
  const tokens = raw.trim().split(/\s+/).filter(Boolean);
  const recurIndex = tokens.findIndex((t) => t.startsWith("/every") || t.startsWith("/recur"));

  let name = tokens.join(" ");
  let recurrence: string | null | undefined;

  if (recurIndex !== -1) {
    name = tokens.slice(0, recurIndex).join(" ");
    const recurPart = tokens
      .slice(recurIndex)
      .filter((t) => !t.startsWith("/policy"))
      .join(" ")
      .replace(/^\/(every|recur:?)\s*/, "");
    const normalized = recurPart.toLowerCase();
    recurrence =
      normalized === "none" || normalized === "clear" ? null : normalizeRecurrenceRule(recurPart);
  }

  const policyToken = tokens.find((t) => t.startsWith("/policy:"));
  const policy = policyToken?.replace("/policy:", "").toLowerCase();
  const missedPolicy =
    policy === "accumulate" || policy === "spike" || policy === "mark_done" ? policy : undefined;

  return { name: name.replace(/^@/, "").trim(), recurrence, missedPolicy };
}
