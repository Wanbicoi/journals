import { describe, expect, it } from "bun:test";
import { createQueryClient, queryClient } from "../queryClient.js";
import { queryKeys } from "./queries.js";

describe("TanStack Query Configuration & Keys", () => {
  it("initializes QueryClient with TUI-safe defaults", () => {
    const client = createQueryClient();
    const defaultOptions = client.getDefaultOptions();

    expect(defaultOptions.queries?.networkMode).toBe("always");
    expect(defaultOptions.queries?.refetchOnWindowFocus).toBe(false);
    expect(defaultOptions.queries?.staleTime).toBe(5000);
    expect(defaultOptions.queries?.retry).toBe(1);
    expect(defaultOptions.mutations?.networkMode).toBe("always");
  });

  it("exports a configured singleton queryClient", () => {
    expect(queryClient).toBeDefined();
    expect(queryClient.getDefaultOptions().queries?.staleTime).toBe(5000);
  });

  it("generates correct query keys for all domain entities", () => {
    expect(queryKeys.entries).toEqual(["entries"]);
    expect(queryKeys.projects).toEqual(["projects"]);
    expect(queryKeys.tags).toEqual(["tags"]);
    expect(queryKeys.dashboard(60)).toEqual(["dashboard", 60]);
    expect(queryKeys.dashboard(30)).toEqual(["dashboard", 30]);

    expect(queryKeys.reflections.all).toEqual(["reflections"]);
    expect(queryKeys.reflections.periods("WEEK")).toEqual(["reflections", "periods", "WEEK"]);
    expect(queryKeys.reflections.detail("WEEK", "2026-W42")).toEqual([
      "reflections",
      "detail",
      "WEEK",
      "2026-W42",
    ]);
  });

  it("invalidating reflections.all invalidates sub-queries", async () => {
    const testClient = createQueryClient();

    // Seed cache for periods and detail
    testClient.setQueryData(queryKeys.reflections.periods("WEEK"), [{ periodKey: "2026-W42" }]);
    testClient.setQueryData(queryKeys.reflections.detail("WEEK", "2026-W42"), {
      periodKey: "2026-W42",
      reflection: { content: "test" },
    });

    const periodsQuery = testClient
      .getQueryCache()
      .find({ queryKey: queryKeys.reflections.periods("WEEK") });
    const detailQuery = testClient
      .getQueryCache()
      .find({ queryKey: queryKeys.reflections.detail("WEEK", "2026-W42") });

    expect(periodsQuery?.isStale()).toBe(false);
    expect(detailQuery?.isStale()).toBe(false);

    // Invalidate root reflections key
    await testClient.invalidateQueries({ queryKey: queryKeys.reflections.all });

    // Both should now be marked stale
    expect(periodsQuery?.isStale()).toBe(true);
    expect(detailQuery?.isStale()).toBe(true);
  });

  it("targeted invalidation does not invalidate unrelated queries", async () => {
    const testClient = createQueryClient();

    testClient.setQueryData(queryKeys.entries, [{ id: "1", content: "entry 1" }]);
    testClient.setQueryData(queryKeys.projects, [{ id: "p1", name: "proj" }]);

    const entriesQuery = testClient.getQueryCache().find({ queryKey: queryKeys.entries });
    const projectsQuery = testClient.getQueryCache().find({ queryKey: queryKeys.projects });

    expect(entriesQuery?.isStale()).toBe(false);
    expect(projectsQuery?.isStale()).toBe(false);

    // Invalidate only projects (e.g. updateProjectContent)
    await testClient.invalidateQueries({ queryKey: queryKeys.projects });

    expect(projectsQuery?.isStale()).toBe(true);
    expect(entriesQuery?.isStale()).toBe(false);
  });
});
