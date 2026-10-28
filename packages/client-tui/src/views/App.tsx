import type { ReactNode } from "react";
import { ViewErrorBoundary } from "../components/ViewErrorBoundary.js";
import { LayoutProvider } from "../contexts/layout.js";
import { ModalsProvider } from "../contexts/modals.js";
import { NavigationProvider, type Tab, useNavigation } from "../contexts/navigation.js";
import { NotificationProvider } from "../contexts/notification.js";
import { UndoProvider } from "../contexts/undo.js";
import { useAppCommands } from "../hooks/useAppCommands.js";
import { AppChrome } from "./AppChrome.js";
import { DashboardView } from "./dashboard/DashboardView.js";
import { ProjectsView } from "./projects/ProjectsView.js";
import { ReflectionsView } from "./reflections/ReflectionsView.js";
import { TimelineView } from "./timeline/TimelineView.js";

export interface AppProps {
  onQuit: () => void;
}

// @unit journals.app
// @summary Journals application shell
// @details Composes one provider per concern — terminal layout, notifications, the route, the
// | modal layer, and the undo history — then hands the active view to the chrome. No server data
// | is loaded here and no size, tab, or filter is passed down as a prop.
export function App({ onQuit }: AppProps) {
  return (
    <LayoutProvider>
      <NotificationProvider>
        <NavigationProvider>
          <ModalsProvider>
            <UndoProvider>
              {/* @call journals.app.screen Render the active view inside the chrome */}
              <AppScreen onQuit={onQuit} />
            </UndoProvider>
          </ModalsProvider>
        </NavigationProvider>
      </NotificationProvider>
    </LayoutProvider>
  );
}

// @unit journals.app.screen
// @summary Route the active view into the chrome
function AppScreen({ onQuit }: AppProps) {
  const { tab } = useNavigation();

  // @call journals.hooks.commands Bind global keymaps and commands
  useAppCommands(onQuit);
  // @call journals.app.route Pick the view for the active route
  const view = renderView(tab);

  // @call journals.views.chrome Render the shell, header, tabs, and status bar
  return (
    <AppChrome>
      <ViewErrorBoundary key={tab} viewName={tab.charAt(0) + tab.slice(1).toLowerCase()}>
        {view}
      </ViewErrorBoundary>
    </AppChrome>
  );
}

// @unit journals.app.route
// @summary Pick the view for the active route
function renderView(tab: Tab): ReactNode {
  switch (tab) {
    case "TIMELINE":
      // @call journals.views.timeline Timeline view: capture, edit, tag, delete
      return <TimelineView />;

    case "REFLECTIONS":
      // @call journals.views.reflections Reflections view: weekly to yearly reviews
      return <ReflectionsView />;

    case "PROJECTS":
      // @call journals.views.projects Projects view: list, create, edit content
      return <ProjectsView />;

    default:
      // @call journals.views.dashboard Dashboard view: streaks and the activity chart
      return <DashboardView />;
  }
}
