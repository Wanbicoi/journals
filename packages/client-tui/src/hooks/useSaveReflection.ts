import type { ReflectionPeriodType } from "@journals/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { saveReflectionApi } from "../api/client.js";
import { invalidateAfterMutation, invalidationKeys } from "./queries.js";

export interface SaveReflectionInput {
  periodType: ReflectionPeriodType;
  periodKey: string;
  content: string;
}

/**
 * Reflection writes belong to the feature layer; views only decide when to save.
 */
export function useSaveReflection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ periodType, periodKey, content }: SaveReflectionInput) =>
      await saveReflectionApi(periodType, periodKey, content),
    onSuccess: async () => {
      await invalidateAfterMutation(queryClient, invalidationKeys.reflectionSaved);
    },
  });
}
