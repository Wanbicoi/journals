# 03: Granular Caching and Invalidation with TanStack Query

**What to build:**
Fine-grained, decoupled client state caching and invalidation using TanStack Query. Terminal views only fetch and poll the data they actively need (such as lazy-loading 60-day telemetry only on the Dashboard tab). Data mutations (capturing notes, editing tags, updating projects) immediately invalidate only their respective cache queries without running monolithic `Promise.all` re-fetches. External editor saves (reflections, project content) trigger automatic cache invalidation without requiring prop-drilled refresh signals.

**Blocked by:** None (can start immediately)

**Status:** completed

- [x] TanStack Query (`@tanstack/react-query`) is configured with TUI-safe terminal defaults (`networkMode: "always"`, `refetchOnWindowFocus: false`, sensible `staleTime`).
- [x] Monolithic 2-second `Promise.all` polling in `useJournalData` is decomposed into isolated query hooks: `useEntries`, `useProjects`, `useTags`, `useDashboardAnalytics`, and `useReflections`.
- [x] Heavy 60-day dashboard telemetry polls only while the Dashboard tab is active (5s), and timeline entries poll only while the Timeline tab is active (3s); no other view polls — they rely on mutation invalidation.
- [x] Mutations trigger targeted cache invalidation rather than full state reloads.
- [x] The `reflectionsRefreshSignal` counter prop-drilled between `App` and `ReflectionsView` is removed; reflections refresh automatically via query invalidation.
