import type { ReflectionPeriodType } from "@journals/core";
import { useCallback, useState } from "react";

/**
 * A cadence change and its selection reset are one transition, never two independent states.
 * Selection is a period key, not an index, so it survives refetches and cadence changes.
 */
export function useReflectionSelection() {
  const [periodType, setPeriodType] = useState<ReflectionPeriodType>("WEEK");
  const [selectedPeriodKey, setSelectedPeriodKey] = useState<string | null>(null);

  const changePeriodType = useCallback((next: ReflectionPeriodType) => {
    setPeriodType(next);
    setSelectedPeriodKey(null);
  }, []);

  return {
    periodType,
    selectedPeriodKey,
    selectPeriodKey: setSelectedPeriodKey,
    changePeriodType,
  };
}
