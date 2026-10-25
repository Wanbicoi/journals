import type { ThemePalette } from "../theme.js";

interface ErrorStateProps {
  error: unknown;
  theme: ThemePalette;
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
}

/**
 * A failed fetch is a render, not an empty screen: say what failed and how to retry.
 */
export function ErrorState({ error, theme }: ErrorStateProps) {
  return (
    <box flexDirection="column" padding={1}>
      <text fg={theme.error || "red"}>{`Could not load journals: ${messageOf(error)}`}</text>
      <text fg={theme.muted}>
        {"Press 'r' to retry, or check that the journals server is running."}
      </text>
    </box>
  );
}
