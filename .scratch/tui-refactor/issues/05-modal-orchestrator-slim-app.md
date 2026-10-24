# 05: Extract Modal Orchestrator and Slim Root Application Shell

**What to build:**
A lightweight, clean root application shell under 150 lines. The repetitive modal imports and inline conditional JSX renderings in `App.tsx` are consolidated into a dedicated `useModalManager` hook and an `<ActiveModal />` dispatcher. Adding or updating a modal dialog or view no longer touches the core layout loop of the application.

**Blocked by:** 
- 02: Native OpenTUI Input Primitives for All TUI Modals
- 04: Collocate View Keyboard Shortcuts and Hotkeys

**Status:** closed

- [x] Modal visibility, active mode, and submission workflows are encapsulated into a `useModalManager` hook.
- [x] A consolidated `<ActiveModal />` component replaces the 9 separate `{inputMode === "..." && <Modal />}` blocks in `App.tsx`.
- [x] Modal input parsing and dispatch logic is decoupled from root `App.tsx`.
- [x] `App.tsx` line count is reduced from 836 lines to under 150 lines as a pure layout coordinator.
- [x] All TUI regression tests and manual smoke test flows pass with green status.
