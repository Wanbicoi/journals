import { useKeyboard } from "@opentui/react";
import { useRef, useState } from "react";
import { useModals } from "../../contexts/modals.js";
import { useNotifications } from "../../contexts/notification.js";
import { useProjects, useTags } from "../../hooks/queries.js";
import { useSuggestions } from "../../hooks/useSuggestions.js";
import { matchesBinding } from "../../keymap.js";
import type { SuggestionType } from "../../suggest.js";
import { useDraftInEditor } from "./useDraftInEditor.js";

interface UseTextModalInputOptions {
  initialValue?: string;
  allowedSuggestions?: SuggestionType[];
  /** Offer Ctrl+E to write the buffer in `$EDITOR`. */
  draftInEditor?: boolean;
  /** Run on Enter. A thrown error keeps the modal open and reports the failure. */
  submit: (value: string) => Promise<unknown> | unknown;
  /** Run on Escape before the modal closes. */
  onCancel?: () => void;
}

function failureMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// @unit journals.modals.text-input
// @summary Handle a single-line modal's input and submit
// @details Keyboard, suggestions, draft-in-editor, and submit/cancel mechanics shared by the
// | single-line modals. Each modal owns its buffer value and its save action.
export function useTextModalInput({
  initialValue = "",
  allowedSuggestions,
  draftInEditor = false,
  submit,
  onCancel,
}: UseTextModalInputOptions) {
  const [buffer, setBuffer] = useState(initialValue);
  const submitting = useRef(false);
  const { close } = useModals();
  const { notify } = useNotifications();
  const { data: projects = [] } = useProjects();
  const { data: tags = [] } = useTags();
  const { activeSuggestionIdx, setActiveSuggestionIdx, getSuggestions, applySuggestion } =
    useSuggestions(projects, tags);

  const suggestions = allowedSuggestions ? getSuggestions(buffer, allowedSuggestions) : null;

  // @call journals.modals.draft Draft the buffer in $EDITOR on Ctrl+E
  useDraftInEditor(draftInEditor, buffer, setBuffer);

  const submitBuffer = async (value = buffer) => {
    if (submitting.current) return;
    submitting.current = true;
    try {
      await submit(value.trim());
      close();
    } catch (error) {
      notify(`Save failed: ${failureMessage(error)}`);
    } finally {
      submitting.current = false;
    }
  };

  const handleSubmit = (value: unknown) =>
    void submitBuffer(typeof value === "string" ? value : buffer);

  // @call journals.contexts.modals Close the modal
  useKeyboard(async (key) => {
    if (matchesBinding(key, "return")) {
      await submitBuffer();
      return;
    }

    if (matchesBinding(key, "escape")) {
      onCancel?.();
      close();
      return;
    }

    if (suggestions && suggestions.matches.length > 1) {
      if (matchesBinding(key, "down")) {
        setActiveSuggestionIdx((prev) => (prev + 1) % suggestions.matches.length);
        return;
      }
      if (matchesBinding(key, "up")) {
        setActiveSuggestionIdx(
          (prev) => (prev - 1 + suggestions.matches.length) % suggestions.matches.length,
        );
        return;
      }
    }

    if (matchesBinding(key, "tab")) {
      setBuffer((prev) => applySuggestion(prev, suggestions));
    }
  });

  return {
    buffer,
    setBuffer,
    suggestions,
    activeSuggestionIdx,
    submitBuffer,
    handleSubmit,
  };
}
