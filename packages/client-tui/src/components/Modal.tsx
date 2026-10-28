import type React from "react";
import { useLayout } from "../contexts/layout.js";
import type { ThemePalette } from "../theme.js";

interface ModalProps {
  maxWidth?: number;
  children: React.ReactNode;
}

// @unit journals.views.modal-frame
// @summary Position a modal inside the terminal
// @details The frame only positions and stacks the modal's boxes. Each box owns its own border,
// | so an input and its footer read as two adjacent popups instead of one padded card.
export function Modal({ maxWidth = 72, children }: ModalProps) {
  const { width, height } = useLayout();
  const top = Math.max(2, Math.floor(height / 4));
  const modalWidth = Math.max(20, Math.min(maxWidth, width - 8));
  // Centre the stack instead of using a sixth of the terminal, which pushed wide modals off-screen.
  const left = Math.max(0, Math.floor((width - modalWidth) / 2));

  return (
    <box position="absolute" top={top} left={left} width={modalWidth} flexDirection="column">
      {children}
    </box>
  );
}

interface ModalPanelProps {
  theme: ThemePalette;
  title: string;
  borderColor?: string;
  bottomTitle?: string;
  children?: React.ReactNode;
}

// @unit journals.views.modal-panel
// @summary Render a titled box inside a modal
// @details A single border style with a centred title for every modal box, matching the
// | lazygit-style popup: the title names the box, and the bottom title carries counts or steps.
export function ModalPanel({ theme, title, borderColor, bottomTitle, children }: ModalPanelProps) {
  const color = borderColor ?? theme.primary;

  return (
    <box
      flexDirection="column"
      borderStyle="single"
      borderColor={color}
      backgroundColor={theme.bg}
      bottomTitle={bottomTitle ? ` ${bottomTitle} ` : undefined}
      bottomTitleAlignment="right"
      paddingLeft={1}
      paddingRight={1}
    >
      {/* The native title cannot carry its own background, so overlay an inverted label on the border. */}
      <box
        position="absolute"
        top={-1}
        left={0}
        width="100%"
        flexDirection="row"
        justifyContent="center"
      >
        <text bg={color} fg={theme.bg}>{` ${title} `}</text>
      </box>
      {children}
    </box>
  );
}

interface ModalInputProps {
  theme: ThemePalette;
  title: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: unknown) => void;
  placeholder?: string;
  borderColor?: string;
}

// @unit journals.views.modal-input
// @summary Render the standard input box of a modal
export function ModalInput({
  theme,
  title,
  value,
  onChange,
  onSubmit,
  placeholder,
  borderColor,
}: ModalInputProps) {
  return (
    <ModalPanel theme={theme} title={title} borderColor={borderColor}>
      <input
        value={value}
        focused
        width="100%"
        onChange={onChange}
        onInput={onChange}
        onSubmit={onSubmit}
        placeholder={placeholder}
        textColor={theme.fg}
        focusedTextColor={theme.fg}
        placeholderColor={theme.muted}
      />
    </ModalPanel>
  );
}

interface ModalFooterProps {
  theme: ThemePalette;
  title?: string;
  borderColor?: string;
  bottomTitle?: string;
  hints?: string[];
  children?: React.ReactNode;
}

// @unit journals.views.modal-footer
// @summary Render the standard footer box of a modal
// @details Hints are one line each, so a long key list never wraps into an unreadable paragraph.
// | A footer that owns a list (suggestions, help rows) passes it as children and a bottom title.
export function ModalFooter({
  theme,
  title = "Tips",
  borderColor,
  bottomTitle,
  hints,
  children,
}: ModalFooterProps) {
  const color = borderColor ?? theme.border;

  return (
    <ModalPanel theme={theme} title={title} borderColor={color} bottomTitle={bottomTitle}>
      {children}
      {hints?.map((hint) => (
        <text key={hint} fg={theme.muted}>
          {hint}
        </text>
      ))}
    </ModalPanel>
  );
}
