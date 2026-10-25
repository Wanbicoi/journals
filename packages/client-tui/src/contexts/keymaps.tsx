import type { Config } from "@journals/core";
import { type ReactNode, createContext, useContext } from "react";

export type Keymaps = Config["keymaps"];

interface KeymapProviderProps {
  value: Keymaps;
  children: ReactNode;
}

const KeymapContext = createContext<Keymaps | null>(null);

export function KeymapProvider({ value, children }: KeymapProviderProps) {
  return <KeymapContext value={value}>{children}</KeymapContext>;
}

export function useKeymaps(): Keymaps {
  const keymaps = useContext(KeymapContext);
  if (!keymaps) throw new Error("useKeymaps must be used within <KeymapProvider>");
  return keymaps;
}
