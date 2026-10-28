# TUI v2 decisions

Intentional choices that are not obvious from the code, recorded so a future review does not re-litigate them.

## D1: `q` quits globally, `Q` selects quarterly reflections

Status: accepted

**Context.** The refactor had bound `q` to the quarterly cadence. Quit is the stronger terminal convention, and a global quit must not be shadowed by a view key.

**Decision.** `q` is the global quit key and quarterly cadence moved to `Q`. `Ctrl+C` stays a fixed escape hatch handled before the scoped dispatcher (`useAppKeymaps`), so it still quits while a modal is open.

**Safety.** Global keys are gated by `useScopedKeymaps` while a modal is open, so typing `q` into a modal input does not quit. Regression test: "ignores global keys while a modal is open, but Ctrl+C still quits".

**Where.** `packages/core/src/config.ts` (`global.quit`, `reflections.cadence_quarter`), `packages/client-tui/src/hooks/useAppKeymaps.ts`, `packages/client-tui/src/hooks/useScopedKeymaps.ts`, `configs/journal.config.example.yaml`.

**Consequences.** No future reflection binding may use `q`; rebinding quit is a config edit, not a code edit.

## D2: Nerd Font and icon sets are a supported config surface

Status: accepted

**Context.** The TUI renders glyphs that only exist in Nerd Fonts, and some terminals cannot display them. The refactor introduced `appearance.use_nerd_font` plus `icons.nerd` and `icons.plain`.

**Decision.** Keep it. `use_nerd_font` selects the whole set, and each icon falls back to its own default, so a user can override one glyph without redeclaring the set. Every rendered glyph lives in `IconSet`, so views never hardcode one.

**Where.** `packages/core/src/config.ts` (`IconSet`, `NERD_ICONS`, `PLAIN_ICONS`, `iconSetSchema`), `packages/client-tui/src/index.tsx` (selects the set), `packages/client-tui/src/contexts/icons.tsx` (`IconProvider` / `useIcons`), `configs/journal.config.example.yaml`.

**Consequences.** Adding an icon requires `IconSet`, both default sets, and the schema; views must read `useIcons()` instead of spelling a glyph.

## D3: The chrome is border-light and hints are contextual

Status: accepted

**Context.** A terminal has little space, and the earlier chrome spent it on persistent borders and repeated shortcut text. The refactor restyled the screens around content and moved shortcuts into one status line.

**Decision.** Keep the leaner, border-light layout: the header carries the brand, tabs, and help; the status bar carries the active view's hints; borders are reserved for regions that genuinely need separation (lists, project detail, modals).

**Where.** `packages/client-tui/src/components/Header.tsx`, `packages/client-tui/src/components/StatusBar.tsx`, `packages/client-tui/src/views/modals/HelpModal.tsx`, and the four views (commit `318e81b`).

**Consequences.** Hints are generated from the keymap, so a new view action must be added to `StatusBar` (and the keymap) rather than written as prose in the view.

## D4: Cross-cutting chrome state lives in one provider per concern

Status: accepted

**Context.** Theme, icons, keymaps, layout, notifications, navigation, modals, and undo are read by the chrome, every view, and most modals. Drilling them from `App` made unrelated props travel through every screen and forced tests to fake the stack.

**Decision.** Keep one provider per concern, composed in `App`; consumers read the matching hook (`useTheme`, `useIcons`, `useKeymaps`, `useLayout`, `useNavigation`, `useModals`, `useUndo`). Screen-local state (selection, drafts, buffer text) stays local. Tests mount the same stack through `TestProviders`.

**Where.** `packages/client-tui/src/contexts/`, `packages/client-tui/src/views/App.tsx`, `packages/client-tui/src/test-support/TestProviders.tsx`, `docs/react-best-practices.md` §2.7.

**Consequences.** Views must not import `config` directly; a new cross-cutting concern becomes a provider, not another prop. New tests need the provider stack, which is why `TestProviders` exists.

## D5: One error boundary per view

Status: accepted

**Context.** A render crash in one panel used to tear down the whole TUI, losing the header, status bar, and every other view.

**Decision.** Keep one `ViewErrorBoundary` around the active view, keyed by tab so navigating away resets it. The fallback names the crashed view and points at the still-working tab keys. Expected load failures remain `ErrorState` renders, not boundary catches.

**Where.** `packages/client-tui/src/components/ViewErrorBoundary.tsx`, `packages/client-tui/src/views/App.tsx` (`key={tab}`), `packages/client-tui/src/components/__tests__/ViewErrorBoundary.test.tsx`.

**Consequences.** A view that fails to fetch should render `ErrorState`; a boundary catch means a real render bug, not an expected outage.
