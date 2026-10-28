import type { PeriodDetail, PeriodItemStatus, ReflectionPeriodType } from "@journals/core";
import { useNotifications } from "../../contexts/notification.js";
import { editInEditor } from "../../editor.js";
import type { useSaveReflection } from "../../hooks/useSaveReflection.js";
import { useScopedKeymaps } from "../../hooks/useScopedKeymaps.js";

interface UseReflectionKeymapsOptions {
  periodType: ReflectionPeriodType;
  periods: PeriodItemStatus[];
  selectedPeriodIdx: number;
  currentDetail: PeriodDetail | null;
  refetchDetail: () => Promise<{ data?: PeriodDetail | null }>;
  saveReflection: ReturnType<typeof useSaveReflection>;
  onChangePeriodType: (type: ReflectionPeriodType) => void;
  onSelectPeriodKey: (key: string) => void;
}

// @unit journals.views.reflections-keys
// @summary Route reflection keys to cadence, selection, and the editor
export function useReflectionKeymaps({
  periodType,
  periods,
  selectedPeriodIdx,
  currentDetail,
  refetchDetail,
  saveReflection,
  onChangePeriodType,
  onSelectPeriodKey,
}: UseReflectionKeymapsOptions) {
  const { notify } = useNotifications();

  const openEditor = async () => {
    const currentPeriod = periods[selectedPeriodIdx];
    if (!currentPeriod) return;

    try {
      const { data: freshDetail } = await refetchDetail();
      const detail = freshDetail ?? currentDetail;
      const initialContent =
        detail?.reflection?.content || `# Reflection: ${currentPeriod.label}\n\n`;

      const saved = await editInEditor(initialContent, (content) =>
        saveReflection.mutateAsync({
          periodType,
          periodKey: currentPeriod.periodKey,
          content,
        }),
      );

      if (saved) notify(`Saved reflection for ${currentPeriod.periodKey}`);
    } catch (_e) {
      notify("Failed to edit reflection");
    }
  };

  // @call journals.actions.edit-in-editor Edit the reflection in $EDITOR
  useScopedKeymaps("reflections", {
    cadence_week: () => {
      onChangePeriodType("WEEK");
      notify("Weekly Reflections");
    },
    cadence_month: () => {
      onChangePeriodType("MONTH");
      notify("Monthly Reflections");
    },
    cadence_quarter: () => {
      onChangePeriodType("QUARTER");
      notify("Quarterly Reflections");
    },
    cadence_year: () => {
      onChangePeriodType("YEAR");
      notify("Yearly Reflections");
    },

    down: () => {
      const nextPeriod = periods[Math.min(selectedPeriodIdx + 1, Math.max(0, periods.length - 1))];
      if (nextPeriod) onSelectPeriodKey(nextPeriod.periodKey);
    },

    up: () => {
      const previousPeriod = periods[Math.max(0, selectedPeriodIdx - 1)];
      if (previousPeriod) onSelectPeriodKey(previousPeriod.periodKey);
    },

    open_reflection: () => void openEditor(),
  });
}
