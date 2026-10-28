import { useTerminalDimensions } from "@opentui/react";
import { type ReactNode, createContext, useContext, useMemo } from "react";

export interface LayoutValue {
  width: number;
  height: number;
}

interface LayoutProviderProps {
  children: ReactNode;
}

const LayoutContext = createContext<LayoutValue | null>(null);

const MIN_WIDTH = 60;
const MIN_HEIGHT = 20;

// @unit journals.contexts.layout
// @summary Track the terminal size once
// @details The defaults and minimums live here instead of at every `useTerminalDimensions` call
// | site. The chrome, the status bar, and every modal read the same value, so a resize cannot
// | leave one of them on a different size.
export function LayoutProvider({ children }: LayoutProviderProps) {
  const dimensions = useTerminalDimensions();
  const width = Math.max(MIN_WIDTH, dimensions.width ?? 100);
  const height = Math.max(MIN_HEIGHT, dimensions.height ?? 30);

  const value = useMemo<LayoutValue>(() => ({ width, height }), [width, height]);

  return <LayoutContext value={value}>{children}</LayoutContext>;
}

export function useLayout(): LayoutValue {
  const value = useContext(LayoutContext);
  if (!value) throw new Error("useLayout must be used within <LayoutProvider>");
  return value;
}
