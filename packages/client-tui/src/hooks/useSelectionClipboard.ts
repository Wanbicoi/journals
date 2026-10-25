import { useRenderer, useSelectionHandler } from "@opentui/react";
import { copyToClipboard } from "../clipboard.js";

/**
 * Copying a terminal selection belongs to the screen, not to every view that can show text.
 */
export function useSelectionClipboard(onStatusMessage: (message: string) => void) {
  const renderer = useRenderer();

  useSelectionHandler((selection) => {
    const text = selection?.getSelectedText();
    if (!text) return;

    copyToClipboard(text, renderer);
    const preview = text.trim().replace(/\s+/g, " ");
    const display = preview.length > 30 ? `${preview.slice(0, 30)}...` : preview;
    onStatusMessage(`Copied to clipboard: "${display}"`);
  });
}
