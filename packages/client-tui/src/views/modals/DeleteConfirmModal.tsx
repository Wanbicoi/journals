import { Modal } from "../../components/Modal.js";
import type { ThemePalette } from "../../theme.js";

interface DeleteConfirmModalProps {
  width: number;
  height: number;
  entrySummary: string;
  theme: ThemePalette;
}

export function DeleteConfirmModal({
  width,
  height,
  entrySummary,
  theme,
}: DeleteConfirmModalProps) {
  return (
    <Modal width={width} height={height} theme={theme} borderColor={theme.highlight} maxWidth={64}>
      <text bg={theme.highlight} fg={theme.selectedFg}>
        {" ⚠️  DELETE NOTE "}
      </text>
      <text fg={theme.fg} marginTop={1}>
        {"Are you sure you want to delete:"}
      </text>
      <text fg={theme.muted}>{`"${entrySummary.slice(0, 48)}..."`}</text>
      <box marginTop={1} flexDirection="row">
        <text fg={theme.highlight}>{"[y: Confirm Delete]"}</text>
        <text> </text>
        <text fg={theme.muted}>{"[n / Esc: Cancel]"}</text>
      </box>
    </Modal>
  );
}
