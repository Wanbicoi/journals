import { normalizeRecurrenceRule } from "@journals/core";
import { Modal } from "../../components/Modal.js";
import type { ThemePalette } from "../../theme.js";

interface EditProjectSettingsModalProps {
  width: number;
  height: number;
  projectName: string;
  inputBuffer: string;
  projectIcon: string;
  theme: ThemePalette;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
}

export function EditProjectSettingsModal({
  width,
  height,
  projectName,
  inputBuffer,
  projectIcon,
  theme,
  onChange,
  onSubmit,
}: EditProjectSettingsModalProps) {
  const tokens = inputBuffer.split(/\s+/);
  let recurrencePreview: string | null = null;
  const recurIndex = tokens.findIndex((t) => t.startsWith("/every") || t.startsWith("/recur"));
  if (recurIndex !== -1) {
    const recurPart = tokens
      .slice(recurIndex)
      .join(" ")
      .replace(/^\/(every|recur:?)\s*/, "");
    if (recurPart.toLowerCase() === "none" || recurPart.toLowerCase() === "clear") {
      recurrencePreview = "None (Remove Routine)";
    } else {
      recurrencePreview = normalizeRecurrenceRule(recurPart);
    }
  }

  const policyToken = tokens.find((t) => t.startsWith("/policy:"));
  const policyPreview = policyToken ? policyToken.replace("/policy:", "") : null;

  return (
    <Modal width={width} height={height} theme={theme} borderColor={theme.primary}>
      <text
        fg={theme.primary}
      >{`${projectIcon} EDIT PROJECT ROUTINE & SETTINGS: @${projectName}`}</text>
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
          placeholder="/every cadence [/policy:accumulate|spike|mark_done]"
          textColor={theme.fg}
          focusedTextColor={theme.fg}
          placeholderColor={theme.muted}
        />
      </box>
      {recurrencePreview && (
        <text fg={theme.accent}>{`Detected Recurrence: ${recurrencePreview}`}</text>
      )}
      {policyPreview && (
        <text fg={theme.warning || "yellow"}>{`Detected Policy: ${policyPreview}`}</text>
      )}
      <text fg={theme.muted}>
        {"Recurrence: Add /every <cadence> (e.g. /every weekday, /recur daily, /recur:none)"}
      </text>
      <text fg={theme.muted}>
        {"Policy: Add /policy:accumulate | /policy:spike | /policy:mark_done"}
      </text>
      <text fg={theme.muted}>{"[Enter: Save Changes] [Esc: Cancel]"}</text>
    </Modal>
  );
}
