import type { IconSet } from "@journals/core";
import { type ReactNode, createContext, useContext } from "react";

interface IconProviderProps {
  value: IconSet;
  children: ReactNode;
}

const IconContext = createContext<IconSet | null>(null);

export function IconProvider({ value, children }: IconProviderProps) {
  return <IconContext value={value}>{children}</IconContext>;
}

export function useIcons(): IconSet {
  const icons = useContext(IconContext);
  if (!icons) throw new Error("useIcons must be used within <IconProvider>");
  return icons;
}
