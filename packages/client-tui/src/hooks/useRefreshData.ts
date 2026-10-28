import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

// @unit journals.hooks.refresh
// @summary Refresh every cached query
// @details The global `r` command: refetch entries, projects, tags, dashboard, and reflections in
// | one invalidation instead of each view polling on a timer.
export function useRefreshData() {
  const queryClient = useQueryClient();

  return useCallback(async () => {
    await queryClient.invalidateQueries();
  }, [queryClient]);
}
