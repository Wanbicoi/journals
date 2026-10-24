import { normalizeRecurrenceRule } from "@journals/core";
import { Modal } from "../../components/Modal.js";
import type { ThemePalette } from "../../theme.js";

interface NewProjectModalProps {
  width: number;
  height: number;
  inputBuffer: string;
  projectIcon: string;
  theme: ThemePalette;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
}

export function NewProjectModal({
  width,
  height,
  inputBuffer,
  projectIcon,
  theme,
  onChange,
  onSubmit,
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
      <box flexDirection="row">
        <text fg={theme.fg}>{"Input: "}</text>
        <input
          value={inputBuffer}
          focused
          onChange={onChange}
          onInput={onChange}
          onSubmit={
            onSubmit ? (e: unknown) => onSubmit(typeof e === "string" ? e : inputBuffer) : undefined
          }
          placeholder="Project name [/every cadence] [/policy:...]"
          textColor={theme.fg}
          focusedTextColor={theme.fg}
          placeholderColor={theme.muted}
        />
      </box>
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
