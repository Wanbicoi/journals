---
name: run-tui
description: >-
  Run, inspect, and test the Journals TUI headlessly via PTY or interactively.
---

# Journals TUI (`packages/client-tui`)

Test, drive, and inspect the Terminal User Interface headlessly using a virtual pseudo-terminal (PTY) runner.

## Prerequisites

The TUI requires the Hono backend on `http://127.0.0.1:4321`. Check before running:
```bash
curl -sf http://127.0.0.1:4321/health || bun run dev:server
```

---

## Headless Execution (Automated & Agents)

Because agents lack an interactive TTY, use [`interact_tui.py`](./scripts/interact_tui.py). It spins up a PTY, sends key sequences, and renders/snapshots output.

### 1. Capture Screen Snapshot
Inspect the rendered layout, active view, and modal states:
```bash
python3 .agents/skills/run-tui/scripts/interact_tui.py --snapshot
```

### 2. Drive Key Sequences
Send inputs, pauses, and actions with `--keys`:
```bash
# Navigate: Switch to Projects (2), wait, switch back to Timeline (1), quit (q)
python3 .agents/skills/run-tui/scripts/interact_tui.py --keys "2" "SLEEP:0.5" "1" "q"

# Quick Capture: open note modal (n), type text, submit (ENTER), wait, quit (q)
python3 .agents/skills/run-tui/scripts/interact_tui.py --keys "n" "Automated note @Inbox #agent" "ENTER" "SLEEP:0.5" "q"

# Filter: search notes (/)
python3 .agents/skills/run-tui/scripts/interact_tui.py --keys "/" "Journals" "ENTER" "SLEEP:0.5" "q"

# Debug raw ANSI escape codes:
python3 .agents/skills/run-tui/scripts/interact_tui.py --keys "1" "q" --raw
```

### Key Tokens Reference

- **Views**: `1` (Timeline), `2` (Projects)
- **Modals**: `n` (Quick Capture), `N` (New Project), `?` (Help), `/` (Filter)
- **Actions**: `e` (Edit), `d` (Delete + `y/n`), `p` (Reassign project), `t` (Edit tags)
- **Special Tokens**: `ENTER`, `ESCAPE`, `UP`, `DOWN`, `LEFT`, `RIGHT`, `SPACE`, `TAB`, `SLEEP:<seconds>`

---

## Interactive Run (Human Only)

When driving in an attached terminal:
```bash
bun run dev:tui
```

---

## Verification

After executing headless mutations via `interact_tui.py`, verify state persistence against the backend API:
```bash
# Verify new entry was created
curl -s http://127.0.0.1:4321/entries | jq '.[0]'
```
