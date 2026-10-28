import { PLAIN_ICONS } from "@journals/core";
import type { ReactNode } from "react";
import { config } from "../api/client.js";
import { IconProvider } from "../contexts/icons.js";
import { KeymapProvider, type Keymaps } from "../contexts/keymaps.js";
import { LayoutProvider } from "../contexts/layout.js";
import { ModalsProvider } from "../contexts/modals.js";
import { ThemeProvider } from "../contexts/theme.js";
import { getTheme } from "../theme.js";

interface TestProvidersProps {
  children: ReactNode;
  keymaps?: Keymaps;
}

/**
 * The ambient dependencies every view expects. Keeping the wrapper explicit documents them for
 * tests instead of hiding a default provider inside the hooks.
 */
export function TestProviders({ children, keymaps = config.keymaps }: TestProvidersProps) {
  return (
    <ThemeProvider theme={getTheme("default")} dayStartHour={0}>
      <IconProvider value={PLAIN_ICONS}>
        <KeymapProvider value={keymaps}>
          <LayoutProvider>
            <ModalsProvider>{children}</ModalsProvider>
          </LayoutProvider>
        </KeymapProvider>
      </IconProvider>
    </ThemeProvider>
  );
}
