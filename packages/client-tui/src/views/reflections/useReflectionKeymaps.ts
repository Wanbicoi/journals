import type { PeriodDetail, PeriodItemStatus, ReflectionPeriodType } from "@journals/core";
import { useKeyboard } from "@opentui/react";
import { useKeymaps } from "../../contexts/keymaps.js";
import { openExternalEditor } from "../../editor.js";
import type { useSaveReflection } from "../../hooks/useSaveReflection.js";
import { matchesAnyBinding } from "../../keymap.js";

interface UseReflectionKeymapsOptions {
  isActive: boolean;
  periodType: ReflectionPeriodType;
  periods: PeriodItemStatus[];
  selectedPeriodIdx: number;
  currentDetail: PeriodDetail | null;
  refetchDetail: () => Promise<{ data?: PeriodDetail | null }>;
  saveReflection: ReturnType<typeof useSaveReflection>;
  onChangePeriodType: (type: ReflectionPeriodType) => void;
  onSelectPeriodKey: (key: string) => void;
  onStatusMessage?: (msg: string) => void;
  onOpenEditor?: () => void;
}

// @unit journals.views.reflections-keys
// @summary Route reflection keys to cadence, selection, and the editor
export function useReflectionKeymaps({
  isActive,
  periodType,
  periods,
  selectedPeriodIdx,
  currentDetail,
  refetchDetail,
  saveReflection,
  onChangePeriodType,
  onSelectPeriodKey,
  onStatusMessage,
  onOpenEditor,
}: UseReflectionKeymapsOptions) {
  const keymaps = useKeymaps();

  // @call journals.server.save-reflection Save a reflection
  useKeyboard(async (key) => {
    if (!isActive) return;

    // Cadence switching: w, m, q, y
    if (matchesAnyBinding(key, "w", "W")) {
      onChangePeriodType("WEEK");
      onStatusMessage?.("Weekly Reflections");
    } else if (matchesAnyBinding(key, "m", "M")) {
      onChangePeriodType("MONTH");
      onStatusMessage?.("Monthly Reflections");
    } else if (matchesAnyBinding(key, "q", "Q")) {
      onChangePeriodType("QUARTER");
      onStatusMessage?.("Quarterly Reflections");
    } else if (matchesAnyBinding(key, "y", "Y")) {
      onChangePeriodType("YEAR");
      onStatusMessage?.("Yearly Reflections");
    } else if (matchesAnyBinding(key, "j", "down", keymaps.down)) {
      const nextPeriod = periods[Math.min(selectedPeriodIdx + 1, Math.max(0, periods.length - 1))];
      if (nextPeriod) onSelectPeriodKey(nextPeriod.periodKey);
    } else if (matchesAnyBinding(key, "k", "up", keymaps.up)) {
      const previousPeriod = periods[Math.max(0, selectedPeriodIdx - 1)];
      if (previousPeriod) onSelectPeriodKey(previousPeriod.periodKey);
    } else if (matchesAnyBinding(key, "e", "return", keymaps.edit_project_content)) {
      // External editor spawn: e, Enter
      if (onOpenEditor) {
        onOpenEditor();
      } else {
        try {
          const currentP = periods[selectedPeriodIdx];
          if (currentP) {
            const { data: freshDetail } = await refetchDetail();
            const detail = freshDetail ?? currentDetail;
            const initialContent =
              detail?.reflection?.content || `# Reflection: ${currentP.label}\n\n`;
            const updated = openExternalEditor(initialContent);
            if (updated !== initialContent) {
              await saveReflection.mutateAsync({
                periodType,
                periodKey: currentP.periodKey,
                content: updated,
              });
              onStatusMessage?.(`Saved reflection for ${currentP.periodKey}`);
            }
          }
        } catch (_e) {
          onStatusMessage?.("Failed to edit reflection");
        }
      }
    }
  });
}
