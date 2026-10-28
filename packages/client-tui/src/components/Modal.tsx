import type React from "react";
import { useLayout } from "../contexts/layout.js";
import type { ThemePalette } from "../theme.js";

interface ModalProps {
  theme: ThemePalette;
  borderColor?: string;
  maxWidth?: number;
  children: React.ReactNode;
}

// @unit journals.views.modal-frame
// @summary Position a modal inside the terminal
export function Modal({ theme, borderColor, maxWidth = 72, children }: ModalProps) {
  const { width, height } = useLayout();
  const top = Math.max(2, Math.floor(height / 4));
  const left = Math.max(4, Math.floor(width / 6));
  const modalWidth = Math.min(maxWidth, width - 8);

  return (
    <box
      position="absolute"
      top={top}
      left={left}
      width={modalWidth}
      flexDirection="column"
      borderStyle="single"
      borderColor={borderColor || theme.primary}
      backgroundColor={theme.bg}
      padding={1}
    >
      {children}
    </box>
  );
}
