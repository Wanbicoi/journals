import {
  type KeyBinding,
  type TextareaRenderable,
  defaultTextareaKeyBindings,
} from "@opentui/core";
import { useEffect, useMemo, useRef } from "react";
import { Modal, ModalFooter, ModalPanel } from "../../components/Modal.js";
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

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.gotoBufferEnd();
    }
  }, []);

  const keyBindings: KeyBinding[] = useMemo(() => {
    const submitKeys =
      typeof keymaps.modal.submit === "string" ? [keymaps.modal.submit] : keymaps.modal.submit;

    return [
      ...defaultTextareaKeyBindings.filter((b) => b.action !== "newline" && b.action !== "submit"),
      { name: "return", shift: true, action: "newline" },
      { name: "return", meta: true, action: "newline" },
      { name: "kpenter", shift: true, action: "newline" },
      { name: "kpenter", meta: true, action: "newline" },
      ...submitKeys.map((name) => ({ name, action: "submit" as const })),
    ];
  }, [keymaps.modal.submit]);

  return (
    <Modal maxWidth={100}>
      <ModalPanel theme={theme} title="Edit note content" borderColor={theme.primary}>
        <textarea
          ref={textareaRef}
          focused
          initialValue={entry.content}
          height={6}
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
      </ModalPanel>
      <ModalFooter
        theme={theme}
        title="Tips"
        hints={[
          `[${bindingLabel(keymaps.modal.submit)}] Save   [Shift+Enter / Alt+Enter] Newline   [${bindingLabel(keymaps.modal.cancel)}] Cancel`,
        ]}
      />
    </Modal>
  );
}
