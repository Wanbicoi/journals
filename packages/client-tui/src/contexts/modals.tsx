import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Entry, Project } from "../hooks/queries.js";

/**
 * One modal at a time, and every modal carries its own target. The union is the contract: a
 * modal cannot be opened without the record it acts on.
 */
export type ModalState =
  | { name: "capture" }
  | { name: "filter" }
  | { name: "help" }
  | { name: "new-project" }
  | { name: "edit-content"; entry: Entry }
  | { name: "edit-project"; entry: Entry }
  | { name: "edit-tags"; entry: Entry }
  | { name: "delete-entry"; entry: Entry }
  | { name: "edit-project-settings"; project: Project };

export interface ModalsValue {
  modal: ModalState | null;
  isOpen: boolean;
  open: (modal: ModalState) => void;
  close: () => void;
}

const ModalsContext = createContext<ModalsValue | null>(null);

interface ModalsProviderProps {
  children: ReactNode;
}

// @unit journals.contexts.modals
// @summary Open and close the active modal
// @details A Mantine-style modals manager: callers say `open({ name, ...target })`, the provider
// | holds the one active modal, and `<ActiveModal>` renders it. No caller passes modal state,
// | input buffers, or open flags around.
export function ModalsProvider({ children }: ModalsProviderProps) {
  const [modal, setModal] = useState<ModalState | null>(null);

  const open = useCallback((next: ModalState) => {
    setModal(next);
  }, []);

  const close = useCallback(() => {
    setModal(null);
  }, []);

  const value = useMemo<ModalsValue>(
    () => ({ modal, isOpen: modal !== null, open, close }),
    [modal, open, close],
  );

  return <ModalsContext value={value}>{children}</ModalsContext>;
}

export function useModals(): ModalsValue {
  const value = useContext(ModalsContext);
  if (!value) throw new Error("useModals must be used within <ModalsProvider>");
  return value;
}
