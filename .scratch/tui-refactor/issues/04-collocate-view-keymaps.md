# 04: Collocate View Keyboard Shortcuts and Hotkeys

**What to build:**
Self-contained, view-level keyboard navigation and action handling. Each tab view (`TimelineView`, `ProjectsView`, `DashboardView`, `ReflectionsView`) listens to and manages its own hotkeys and navigation commands locally rather than routing all keystrokes through a single centralized 300+ line switch statement in the root application component.

**Blocked by:** 02: Native OpenTUI Input Primitives for All TUI Modals

**Status:** closed

- [x] `TimelineView` handles its own navigation keys (`j`/`k`, `g`/`G`), date jumps (`t`, `[`, `]`), soft-delete undo (`u`), and entry actions (`c`, `e`, `p`, `t`, `d`).
- [x] `ProjectsView` handles project list navigation (`j`/`k`), new project modal trigger (`n`), routine settings modal (`P`), and external editor launch (`o`).
- [x] `DashboardView` handles routine telemetry focus navigation (`h`/`l`) and today's checklist completion toggle (`Space`).
- [x] `ReflectionsView` handles cadence switching (`w`, `m`, `Q`, `y`; `q` is reserved for global quit) and external editor reflection editing (`e`, `Enter`).
- [x] Root keyboard listener only handles global actions: application tabs (`1`, `2`, `3`, `4`, `Tab`), global help (`?`), and exit (`Ctrl+C`).
