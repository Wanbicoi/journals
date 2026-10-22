import type { TextareaRenderable } from "@opentui/core";
import React, { useEffect, useRef } from "react";
import { Modal } from "../../components/Modal.js";
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

  return (
    <Modal width={width} height={height} theme={theme} borderColor={theme.primary}>
      <text bg={theme.primary} fg={theme.selectedFg}>
        {" EDIT NOTE CONTENT "}
      </text>
      <text fg={theme.muted}>{"Modify note text. Enter to save, Esc to cancel:"}</text>

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
          onKeyDown={(key) => {
            if (key.name === "escape") {
              onCancel();
            } else if (key.name === "return" && !key.shift) {
              const text = textareaRef.current?.plainText ?? "";
              onSave(text);
            }
          }}
        />
      </box>

      <box marginTop={1} flexDirection="row">
        <text fg={theme.accent}>{"[Enter: Save]"}</text>
        <text> </text>
        <text fg={theme.muted}>{"[Esc: Cancel]"}</text>
      </box>
    </Modal>
  );
}
