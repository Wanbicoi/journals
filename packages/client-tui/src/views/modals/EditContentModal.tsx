import {
  type KeyBinding,
  type TextareaRenderable,
  defaultTextareaKeyBindings,
} from "@opentui/core";
import { useEffect, useMemo, useRef } from "react";
import { Modal } from "../../components/Modal.js";
import { matchesBinding } from "../../keymap.js";
import type { ThemePalette } from "../../theme.js";

interface EditContentModalProps {
  width: number;
  height: number;
  initialValue: string;
  theme: ThemePalette;
  onSave: (content: string) => void;
  onCancel: () => void;
}

export function EditContentModal({
  width,
  height,
  initialValue,
  theme,
  onSave,
  onCancel,
}: EditContentModalProps) {
  const textareaRef = useRef<TextareaRenderable | null>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.gotoBufferEnd();
    }
  }, []);

  const keyBindings: KeyBinding[] = useMemo(
    () => [
      ...defaultTextareaKeyBindings.filter((b) => b.action !== "newline" && b.action !== "submit"),
      { name: "return", shift: true, action: "newline" },
      { name: "return", meta: true, action: "newline" },
      { name: "return", action: "submit" },
      { name: "kpenter", shift: true, action: "newline" },
      { name: "kpenter", meta: true, action: "newline" },
      { name: "kpenter", action: "submit" },
    ],
    [],
  );

  return (
    <Modal width={width} height={height} theme={theme} borderColor={theme.primary}>
      <text bg={theme.primary} fg={theme.selectedFg}>
        {" EDIT NOTE CONTENT "}
      </text>
      <text fg={theme.muted}>
        {"Modify note text. Enter to save, Shift+Enter or Alt+Enter for newline:"}
      </text>

      <box
        marginTop={1}
        borderStyle="single"
        borderColor={theme.primary}
        paddingLeft={1}
        paddingRight={1}
      >
        <textarea
          ref={textareaRef}
          focused
          initialValue={initialValue}
          height={4}
          wrapMode="word"
          textColor={theme.fg}
          focusedTextColor={theme.fg}
          keyBindings={keyBindings}
          onSubmit={() => {
            const text = textareaRef.current?.plainText ?? "";
            onSave(text);
          }}
          onKeyDown={(key) => {
            if (matchesBinding(key, "escape")) {
              onCancel();
            }
          }}
        />
      </box>

      <box marginTop={1} flexDirection="row">
        <text fg={theme.accent}>{"[Enter: Save]"}</text>
        <text> </text>
        <text fg={theme.muted}>{"[Shift+Enter / Alt+Enter: Newline]"}</text>
        <text> </text>
        <text fg={theme.muted}>{"[Esc: Cancel]"}</text>
      </box>
    </Modal>
  );
}
