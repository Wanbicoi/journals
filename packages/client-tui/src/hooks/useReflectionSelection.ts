import type { ReflectionPeriodType } from "@journals/core";
import { useCallback, useState } from "react";

/**
 * A cadence change and its selection reset are one transition, never two independent states.
 */
export function useReflectionSelection() {
  const [periodType, setPeriodType] = useState<ReflectionPeriodType>("WEEK");
  const [selectedPeriodIdx, setSelectedPeriodIdx] = useState(0);

  const changePeriodType = useCallback((next: ReflectionPeriodType) => {
    setPeriodType(next);
    setSelectedPeriodIdx(0);
  }, []);

  return {
    periodType,
    selectedPeriodIdx,
    selectPeriodIdx: setSelectedPeriodIdx,
    changePeriodType,
  };
}
