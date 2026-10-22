---
name: run-tui
description: >-
  Use this skill to run the Journals Terminal User Interface (TUI), inspect its layout,
  test keybindings and navigation, capture notes, or verify client-side UI behaviors
  headlessly or interactively.
---

# Run and Interact with the Journals TUI

This skill provides step-by-step guidance and utilities for running, testing, and interacting with the `packages/client-tui` application.

## Prerequisites

1. **Backend Server**: The TUI interacts with the Hono SQLite backend.
   Ensure the server is running on `http://127.0.0.1:4321`:
   ```bash
   # Check if running
   curl -s http://127.0.0.1:4321/health

   # If not running, start in the background:
   bun run dev:server
   ```

2. **Terminal Requirements**:
   The TUI uses `@opentui/react` and expects ANSI terminal capabilities (e.g. `xterm-256color`, minimum 80x24 dimensions).

---

## Direct Interactive Run (Manual User Mode)

To launch the TUI directly in a terminal session:

```bash
bun run dev:tui
```

### Keybindings & Mouse Controls

| Input | Action |
| :--- | :--- |
| **Mouse Click** | Click on top tabs (`[1] Timeline Stream`, `[2] Projects`) to switch tabs directly |
| `1` | Switch to **Timeline Stream** view (grouped chronologically) |
| `2` | Switch to **Projects & Preview** view |
| `j` / `k` or `Down` / `Up` | Navigate entries / project list |
| `n` | Open **Quick Capture** modal (`@project #tags note content`) |
| `N` | Create a new project modal |
| `e` | **Timeline View**: Edit selected note content inline<br/>**Projects View**: Open project markdown in `$EDITOR` |
| `d` | **Delete** selected note (with confirmation dialog `y/n`) |
| `p` | Reassign selected note's project (`@project`) |
| `t` | Edit selected note's tags (comma-separated `#tags`) |
| `/` | Filter timeline notes or projects |
| `?` | Open **Help** modal (shows all shortcuts) |
| `Escape` | Dismiss modal or clear search filter |
| `Ctrl+c` / `q` | Quit the TUI |

---

## Headless / Automated Interaction (Subagents & CI)

Because the agent runs in non-interactive subshells without an attached TTY, run the bundled helper script [`interact_tui.py`](./scripts/interact_tui.py) which opens a virtual pseudo-terminal (PTY) to send key sequences and capture terminal frames.

### 1. Capture a Snapshot of the Current TUI Screen

```bash
python3 .agents/skills/run-tui/scripts/interact_tui.py --snapshot
```

### 2. Switch Views and Navigate

```bash
# Switch to Projects view (key '2'), sleep 0.5s, then quit ('q')
python3 .agents/skills/run-tui/scripts/interact_tui.py --keys "2" "SLEEP:0.5" "q"

# Switch back to Timeline (key '1'), move down twice ('j', 'j')
python3 .agents/skills/run-tui/scripts/interact_tui.py --keys "1" "j" "j" "q"
```

### 3. Test Quick Capture (`n`)

```bash
# Press 'n' to open modal, write a note, press ENTER, then quit
python3 .agents/skills/run-tui/scripts/interact_tui.py --keys "n" "Testing quick capture note @Inbox #automated" "ENTER" "SLEEP:0.5" "q"
```

### 4. Test Filtering (`/`)

```bash
# Filter for specific keyword
python3 .agents/skills/run-tui/scripts/interact_tui.py --keys "/" "Journals" "ENTER" "SLEEP:0.5" "q"
```

### 5. Inspect Raw ANSI Stream

To debug styling, colors, or OpenTUI escape codes:
```bash
python3 .agents/skills/run-tui/scripts/interact_tui.py --keys "1" "q" --raw
```

---

## Verifying Server Integration

After interacting with the TUI, you can verify changes directly against the server API:
```bash
# Verify entries
curl -s http://127.0.0.1:4321/entries | jq .

# Verify projects
curl -s http://127.0.0.1:4321/projects | jq .
```
