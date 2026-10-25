import { Component, type ErrorInfo, type ReactNode } from "react";
import { useTheme } from "../contexts/theme.js";

interface ViewErrorFallbackProps {
  viewName: string;
  error: Error;
}

function ViewErrorFallback({ viewName, error }: ViewErrorFallbackProps) {
  const theme = useTheme();

  return (
    <box flexDirection="column" padding={1}>
      <text fg={theme.error || "red"}>{`The ${viewName} view crashed.`}</text>
      <text fg={theme.muted}>{error.message}</text>
      <text fg={theme.muted}>
        {"Press 1-4 to switch views; the rest of the app is still running."}
      </text>
    </box>
  );
}

interface ViewErrorBoundaryProps {
  viewName: string;
  children: ReactNode;
}

interface ViewErrorBoundaryState {
  error: Error | null;
}

/**
 * One boundary per view: a thrown panel shows a local fallback instead of tearing down the TUI.
 */
export class ViewErrorBoundary extends Component<ViewErrorBoundaryProps, ViewErrorBoundaryState> {
  state: ViewErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ViewErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[${this.props.viewName}] ${error.message}`, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return <ViewErrorFallback viewName={this.props.viewName} error={this.state.error} />;
    }
    return this.props.children;
  }
}
