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
