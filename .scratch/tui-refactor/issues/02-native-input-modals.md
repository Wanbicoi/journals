# 02: Native OpenTUI Input Primitives for All TUI Modals

**What to build:**
Real terminal text input editing in all modal dialogs (Quick Capture, New Project, Edit Project, Edit Project Settings, Edit Tags, and Filter) powered by OpenTUI's native input primitives. Users can navigate text with arrow keys, jump words, backspace cleanly, and paste text without relying on manual string concatenation or simulated block cursor glyphs.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] All single-line modal dialogs (Quick Capture, New Project, Edit Project, Edit Project Settings, Edit Tags, Filter) use OpenTUI `<input />` components.
- [ ] Manual string buffer concatenation (`inputBuffer + str`, `slice(0, -1)`, Ctrl+W, Ctrl+U) and custom simulated cursor (`█`) are eliminated from root keyboard handling.
- [ ] Arrow navigation, cursor positioning, and standard terminal editing shortcuts work natively in modal inputs.
- [ ] Suggestion dropdown navigation (Tab to complete, Up/Down to navigate) operates reliably alongside native input state.
