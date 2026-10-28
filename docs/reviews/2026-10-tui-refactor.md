# TUI refactor review (October 2026)

Historical snapshot: the deviations found while refactoring the TUI, and the commit that closed
each one. File paths and line numbers describe the tree **before** the refactor; they are kept to
explain the fix, not as current references. All rows are closed. New code must not reintroduce
them; the live rules are in [docs/react-best-practices.md](../react-best-practices.md).

| Rule | Where | What was wrong | Fix direction | Fixed in |
| :--- | :--- | :--- | :--- | :--- |
| §3.2 selection by id | `packages/client-tui/src/views/App.tsx:83` (`filteredEntries[selectedEntryIdx]`) | Index into a filtered array; can select the wrong row or `undefined` after filter/delete/refetch | Store `selectedEntryId`, derive the record, clamp on missing | `c76b2ee`, `0d9ca91` |
| §10 no process control in components | `App.tsx:135,144` | `process.exit(0)` inside a keyboard handler: kills the app mid-render, no cleanup | Emit `onQuit`, own the exit in `index.tsx` | `5f13448` |
| §2.1 one job per file | `App.tsx` (294 lines, 10 `useState`s) | Tab routing, keymap dispatch, undo, clipboard, exit, and modal wiring in one component | Extract `useAppKeymaps`, `useUndoDelete`, `useSelectionClipboard` | `c9686c5`, `0d9ca91` |
| §2.2 no container props | `App.tsx:94` (`journal: journalData`) | Whole service object into `useModalManager`; every consumer rerenders, props untraceable | Pass the specific fields/mutations each modal calls | `1ec0866`, `0d9ca91` |
| §5.5 errors are a render | `packages/client-tui/src/hooks/useJournalData.ts:26,153-165` | Returned object has `loading` but **no error state**; queries fail silently | Expose `isError`/`error`/`refetch`; render an error state | `329c0fd`, `0d9ca91` |
| §5.5 no empty catch | `packages/client-tui/src/hooks/queries.ts:124-126` | `catch { return null }` turns an outage into an empty dashboard | Remove the catch; let `isError` surface it | `329c0fd` |
| §5.4 no `as T` laundering | `queries.ts:90,99,108` | Every response is cast to a type nothing validated | Parse at the boundary or derive the type from the route | `329c0fd` |
| §5.6 polling is not sync | `queries.ts:91,100,109` | `refetchInterval: 5000` on entries, projects, and tags | Drop to `false`; rely on mutation invalidation | `329c0fd` |
| §5.2 invalidation helper | `useJournalData.ts` (27 `invalidateQueries` calls) | Five keys copy-pasted per mutation; `["dashboard"]` literal six times | One `invalidateAfterMutation()` + key helper | `329c0fd` |
| §2.2 prop contracts | `App.tsx:43,57-64` | 10 independent `useState`s for what is a handful of UI machines | Group into reducers or feature hooks | `c9686c5` |
| §2.5 dependency direction | `views/reflections/ReflectionsView.tsx:6,100,105` | The view imports `fetchPeriodDetailApi` / `saveReflectionApi` and calls them directly while also using query hooks — two layers in one file | Move both behind `useReflectionDetail` and a mutation hook | `697a42a` |
| §2.5 no config in presentation | `views/modals/ActiveModal.tsx:2`, `timeline/TimelineView.tsx:5`, `projects/ProjectsView.tsx:5`, `reflections/ReflectionsView.tsx:6` | Views import global `config` for keymaps and appearance instead of receiving them | Props or `KeymapProvider` / `ThemeProvider`; delete `config` imports from views | `1ec0866` |
| §2.6 prop-count signal | `timeline/TimelineView.tsx` (18 props), `projects/ProjectsView.tsx` (14), `dashboard/DashboardView.tsx` (13) | Every prop is used, but the signatures grow with each new action, and all handlers come from screen-level state in `App.tsx` — the boundary is doing too much, not too little | Split each view into feature components that own their handlers; keep the screen to layout + routing | `c9686c5` |
| §2.7 context | `packages/client-tui/src` (zero `createContext`) | Theme, icons, and keymaps are drilled from `App` into every view and modal; `config` imports are the workaround | `ThemeProvider` + `KeymapProvider`, then drop the `config` imports | `1ec0866` |
| §10 error boundaries | `packages/client-tui/src` (none) | A thrown component tears down the whole TUI | One boundary per view | `8c05915` |
| §13 key normalization | `App.tsx:140-175`, `TimelineView.tsx` | Each binding compares `key.name`, `key.sequence`, config value, and a hardcoded fallback inline | `matchesBinding(key, "up")` helper | `a664434`, `0d9ca91` |

What **did** hold up and should be preserved: the scoped keymap gate, the undo-after-delete flow,
derived filtering in the views, and the keymap/modal contract tests.
