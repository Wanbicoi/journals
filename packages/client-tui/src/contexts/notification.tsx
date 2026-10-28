import { type ReactNode, createContext, useContext, useMemo, useState } from "react";

export interface NotificationValue {
  message: string;
  notify: (message: string) => void;
}

interface NotificationProviderProps {
  children: ReactNode;
  initialMessage?: string;
}

const NotificationContext = createContext<NotificationValue | null>(null);

// @unit journals.contexts.notification
// @summary Show a global status notification
// @details One line at the bottom of the screen. Any view or action reports its outcome here
// | instead of threading an `onStatusMessage` callback through every component.
export function NotificationProvider({
  children,
  initialMessage = "Ready",
}: NotificationProviderProps) {
  const [message, setMessage] = useState(initialMessage);
  const value = useMemo<NotificationValue>(() => ({ message, notify: setMessage }), [message]);

  return <NotificationContext value={value}>{children}</NotificationContext>;
}

export function useNotifications(): NotificationValue {
  const value = useContext(NotificationContext);
  if (!value) throw new Error("useNotifications must be used within <NotificationProvider>");
  return value;
}
