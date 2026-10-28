import {
  type KeyBinding,
  type TextareaRenderable,
  defaultTextareaKeyBindings,
} from "@opentui/core";
import { useEffect, useMemo, useRef } from "react";
import { Modal } from "../../components/Modal.js";
import { useKeymaps } from "../../contexts/keymaps.js";
import { useModals } from "../../contexts/modals.js";
import { useNotifications } from "../../contexts/notification.js";
import { useTheme } from "../../contexts/theme.js";
import type { Entry } from "../../hooks/queries.js";
import { useEntryMutations } from "../../hooks/useEntryMutations.js";
import { actionForKey, bindingLabel } from "../../keymap.js";

interface EditContentModalProps {
  entry: Entry;
}

// @unit journals.modals.edit-content
// @summary Edit an entry's content in a textarea
export function EditContentModal({ entry }: EditContentModalProps) {
  const theme = useTheme();
  const keymaps = useKeymaps();
  const { close } = useModals();
  const { notify } = useNotifications();
  // @call journals.hooks.update-entry-content Save the edited content
  const { updateEntryContent } = useEntryMutations();
  const textareaRef = useRef<TextareaRenderable | null>(null);
  const submitKeys =
    typeof keymaps.modal.submit === "string" ? [keymaps.modal.submit] : keymaps.modal.submit;

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
      { name: "kpenter", shift: true, action: "newline" },
      { name: "kpenter", meta: true, action: "newline" },
      ...submitKeys.map((name) => ({ name, action: "submit" as const })),
    ],
    [submitKeys],
  );

  return (
    <Modal theme={theme} borderColor={theme.primary}>
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
          initialValue={entry.content}
          height={4}
          wrapMode="word"
          textColor={theme.fg}
          focusedTextColor={theme.fg}
          keyBindings={keyBindings}
          onSubmit={() => {
            const text = textareaRef.current?.plainText ?? "";
            if (!text) return;
            void (async () => {
              try {
                await updateEntryContent(entry.id, text);
                notify("Updated note content!");
                close();
              } catch (error) {
                notify(`Save failed: ${error instanceof Error ? error.message : String(error)}`);
              }
            })();
          }}
          onKeyDown={(key) => {
            if (actionForKey(key, keymaps.modal) === "cancel") {
              close();
            }
          }}
        />
      </box>

      <box marginTop={1} flexDirection="row">
        <text fg={theme.accent}>{`[${bindingLabel(keymaps.modal.submit)}: Save]`}</text>
        <text> </text>
        <text fg={theme.muted}>{"[Shift+Enter / Alt+Enter: Newline]"}</text>
        <text> </text>
        <text fg={theme.muted}>{`[${bindingLabel(keymaps.modal.cancel)}: Cancel]`}</text>
      </box>
    </Modal>
  );
}
