import type { ReactNode } from "react";
import { Header } from "../components/Header.js";
import { StatusBar } from "../components/StatusBar.js";
import type { Tab } from "../hooks/useAppKeymaps.js";
import type { Entry, Project } from "../hooks/useJournalData.js";
import { ActiveModal } from "./modals/ActiveModal.js";
import type { ModalManager } from "./modals/useModalManager.js";

interface AppChromeProps {
  width: number;
  height: number;
  currentTab: Tab;
  statusMessage: string;
  filterQuery: string;
  modal: ModalManager;
  selectedEntry?: Entry;
  selectedProject?: Project;
  onSelectTab: (tab: Tab) => void;
  children: ReactNode;
}

/**
 * The persistent frame: header, active screen, modal layer, and status bar.
 */

// @unit journals.views.chrome
// @summary Render the shell, tabs, and status bar
export function AppChrome({
  width,
  height,
  currentTab,
  statusMessage,
  filterQuery,
  modal,
  selectedEntry,
  selectedProject,
  onSelectTab,
  children,
}: AppChromeProps) {
  return (
    <box flexDirection="column" width={width} height={height}>
      <Header width={width} currentTab={currentTab} onSelectTab={onSelectTab} />
      <box flexGrow={1} flexDirection="column">
        {children}
      </box>
      <ActiveModal
        modal={modal}
        width={width}
        height={height}
        selectedEntry={selectedEntry}
        selectedProject={selectedProject}
        currentTab={currentTab}
      />
      <StatusBar
        width={width}
        filterQuery={filterQuery}
        statusMessage={statusMessage}
        currentTab={currentTab}
      />
    </box>
  );
}
