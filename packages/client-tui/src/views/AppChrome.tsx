import type { ReactNode } from "react";
import { Header } from "../components/Header.js";
import { StatusBar } from "../components/StatusBar.js";
import { useLayout } from "../contexts/layout.js";
import { ActiveModal } from "./modals/ActiveModal.js";

interface AppChromeProps {
  children: ReactNode;
}

/**
 * The persistent frame: header, active screen, modal layer, and status bar. Every part reads its
 * own state and the terminal size from context; the frame needs no props.
 */

// @unit journals.views.chrome
// @summary Render the shell, tabs, and status bar
export function AppChrome({ children }: AppChromeProps) {
  // @call journals.contexts.layout Read the terminal size
  const { width, height } = useLayout();

  return (
    <box flexDirection="column" width={width} height={height}>
      {/* @call journals.views.header Render the header and its view tabs */}
      <Header />
      <box flexGrow={1} flexDirection="column">
        {children}
      </box>
      {/* @call journals.views.modal-layer Render the active modal */}
      <ActiveModal />
      {/* @call journals.views.status-bar Show the status notification and per-view key hints */}
      <StatusBar />
    </box>
  );
}
