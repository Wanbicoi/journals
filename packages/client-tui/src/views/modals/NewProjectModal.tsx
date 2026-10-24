import { normalizeRecurrenceRule } from "@journals/core";
import { Modal } from "../../components/Modal.js";
import type { ThemePalette } from "../../theme.js";

interface NewProjectModalProps {
  width: number;
  height: number;
  inputBuffer: string;
  projectIcon: string;
  theme: ThemePalette;
}

export function NewProjectModal({
  width,
  height,
  inputBuffer,
  projectIcon,
  theme,
}: NewProjectModalProps) {
  // Check if buffer contains recurrence syntax: e.g. "Fitness /every 2 days" or "Gym /recur:daily /policy:accumulate"
  const tokens = inputBuffer.split(/\s+/);
  let recurrencePreview: string | null = null;
  const recurIndex = tokens.findIndex((t) => t.startsWith("/every") || t.startsWith("/recur"));
  if (recurIndex !== -1) {
    const recurPart = tokens
      .slice(recurIndex)
      .join(" ")
      .replace(/^\/(every|recur:?)\s*/, "");
    recurrencePreview = normalizeRecurrenceRule(recurPart);
  }

  return (
    <Modal width={width} height={height} theme={theme} borderColor={theme.primary}>
      <text fg={theme.primary}>{`${projectIcon} CREATE NEW PROJECT`}</text>
      <text fg={theme.fg}>{`Input: ${inputBuffer}█`}</text>
      {recurrencePreview && <text fg={theme.accent}>{`Detected RRULE: ${recurrencePreview}`}</text>}
      <text fg={theme.muted}>
        {"Optional: Add /recur <interval> (e.g. /recur daily, /every 3 days)"}
      </text>
      <text fg={theme.muted}>
        {"Optional: Add /policy:accumulate or /policy:spike (default: spike)"}
      </text>
      <text fg={theme.muted}>{"[Enter: Create] [Esc: Cancel]"}</text>
    </Modal>
  );
}
