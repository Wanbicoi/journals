import { useRenderer, useSelectionHandler } from "@opentui/react";
import { copyToClipboard } from "../clipboard.js";
import { useNotifications } from "../contexts/notification.js";

// @unit journals.hooks.clipboard
// @summary Copy the terminal selection to the clipboard
// @details Wraps the renderer's selection handler and reports a short preview through the global
// | notification context.
export function useSelectionClipboard() {
  const renderer = useRenderer();
  const { notify } = useNotifications();

  useSelectionHandler((selection) => {
    const text = selection?.getSelectedText();
    if (!text) return;

    copyToClipboard(text, renderer);
    const preview = text.trim().replace(/\s+/g, " ");
    const display = preview.length > 30 ? `${preview.slice(0, 30)}...` : preview;
    notify(`Copied to clipboard: "${display}"`);
  });
}
