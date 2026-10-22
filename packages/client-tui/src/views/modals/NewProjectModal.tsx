import { Modal } from "../../components/Modal.js";
import type { ThemePalette } from "../../theme.js";

interface NewProjectModalProps {
  width: number;
  height: number;
  inputBuffer: string;
  projectIcon: string;
  theme: ThemePalette;
}

export function NewProjectModal({
  width,
  height,
  inputBuffer,
  projectIcon,
  theme,
}: NewProjectModalProps) {
  return (
    <Modal width={width} height={height} theme={theme} borderColor={theme.primary}>
      <text fg={theme.primary}>{`${projectIcon} CREATE NEW PROJECT`}</text>
      <text fg={theme.fg}>{`Project Name: ${inputBuffer}█`}</text>
      <text fg={theme.muted}>{"[Enter: Create] [Esc: Cancel]"}</text>
    </Modal>
  );
}
