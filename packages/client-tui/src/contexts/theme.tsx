import { type ReactNode, createContext, useContext, useMemo } from "react";
import type { ThemePalette } from "../theme.js";

export interface ThemeContextValue {
  theme: ThemePalette;
  dayStartHour: number;
}

interface ThemeProviderProps {
  theme: ThemePalette;
  dayStartHour: number;
  children: ReactNode;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ theme, dayStartHour, children }: ThemeProviderProps) {
  const value = useMemo(() => ({ theme, dayStartHour }), [theme, dayStartHour]);
  return <ThemeContext value={value}>{children}</ThemeContext>;
}

function useThemeContext(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used within <ThemeProvider>");
  return value;
}

export function useTheme(): ThemePalette {
  return useThemeContext().theme;
}

export function useDayStartHour(): number {
  return useThemeContext().dayStartHour;
}
