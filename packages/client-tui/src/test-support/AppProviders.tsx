import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import type { Keymaps } from "../contexts/keymaps.js";
import { NavigationProvider, type Tab } from "../contexts/navigation.js";
import { NotificationProvider } from "../contexts/notification.js";
import { UndoProvider } from "../contexts/undo.js";
import { createQueryClient } from "../queryClient.js";
import { TestProviders } from "./TestProviders.js";

interface AppProvidersProps {
  children: ReactNode;
  client?: QueryClient;
  initialTab?: Tab;
  keymaps?: Keymaps;
}

/**
 * The same provider stack the app mounts, for tests that drive a view or a modal. A test seeds the
 * query client it passes in; everything else is the real ambient context.
 */
export function AppProviders({ children, client, initialTab, keymaps }: AppProvidersProps) {
  const [queryClient] = useState(() => client ?? createQueryClient());

  return (
    <TestProviders keymaps={keymaps}>
      <QueryClientProvider client={queryClient}>
        <NotificationProvider>
          <NavigationProvider initialTab={initialTab}>
            <UndoProvider>{children}</UndoProvider>
          </NavigationProvider>
        </NotificationProvider>
      </QueryClientProvider>
    </TestProviders>
  );
}
