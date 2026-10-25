import { useKeymaps } from "../contexts/keymaps.js";
import { useTheme } from "../contexts/theme.js";

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
}

/**
 * A failed fetch is a render, not an empty screen: say what failed and how to retry.
 */
export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const theme = useTheme();
  const keymaps = useKeymaps();

  return (
    <box flexDirection="column" padding={1}>
      <text fg={theme.error || "red"}>{`Could not load journals: ${messageOf(error)}`}</text>
      <box flexDirection="row" onMouseDown={onRetry}>
        <text fg={theme.muted}>{`Press '${keymaps.refresh}' to retry, or click here. `}</text>
        <text fg={theme.primary}>{"[Retry]"}</text>
      </box>
    </box>
  );
}
