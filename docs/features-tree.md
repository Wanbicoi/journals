# Journals Feature Tree & Interlinking Guide

Comprehensive catalog of all Journals features organized in a tree hierarchy, accompanied by strategies for linking related features together.

---

## 1. Feature Tree

```
Journals
├── 1. Intake & Quick Capture
│   ├── 1.1 Single-Line Parser
│   │   ├── Project Target (@project)
│   │   ├── Tag Assignment (#tag)
│   │   ├── Break Syntax (/break <N>d, /break:N)
│   │   └── Date Override (/date YYYY-MM-DD, /yesterday)
│   ├── 1.2 TUI Capture Modal ('n')
│   │   ├── Live Inline Preview
│   │   ├── Interactive Suggestions (@projects, #tags)
│   │   ├── Break Preset Autocomplete (/break 1d..14d, custom duration)
│   │   └── In-Modal External Editor (Ctrl+E to draft in $EDITOR)
│   └── 1.3 External Global Popups
│       ├── AutoHotkey v2 Desktop Resident Popup
│       └── Python / PowerShell Fallback Triggers
│
├── 2. Daily Timeline & Journal Stream
│   ├── 2.1 Chronological Stream View (Tab [2])
│   │   ├── Daily Date Grouping
│   │   ├── Badges (Project badge, Tag badges, Global badge)
│   │   └── Break Period Indicator (⏸ Nd break)
│   ├── 2.2 Entry Management
│   │   ├── Content Edit ('e')
│   │   ├── Project Reassignment ('p')
│   │   ├── Tag Modification ('t')
│   │   └── Entry Deletion ('d' + confirm) with Soft-Delete & Trash Recovery
│   └── 2.3 Search & Date Filtering
│       ├── Text & Token Filter ('/')
│       ├── Date Filter Drilldown (YYYY-MM-DD)
│       └── Relative Date Jumps ('t' for Today, '[' / ']' for Prev/Next Day)
│
├── 3. Projects & Recurring Routines
│   ├── 3.1 Project Notebooks (Tab [3])
│   │   ├── Project List & Note Count
│   │   ├── Embedded Note History
│   │   └── Markdown Preview Pane
│   ├── 3.2 External Editor Spawning
│   │   └── Launch $EDITOR / nano / nvim for full markdown editing ('e')
│   ├── 3.3 Routine Engine
│   │   ├── RFC 5545 Recurrence (FREQ=DAILY, INTERVAL=2, etc.)
│   │   ├── Natural Language Recurrence (/every 3 days, /every weekday)
│   │   └── Missed Policies
│   │       ├── 'spike' (default date anomaly, no ongoing debt)
│   │       ├── 'accumulate' (compounds overdue make-up backlog)
│   │       └── 'mark_done' (grace policy; forgiven)
│   └── 3.4 Creation & Management
│       ├── New Project Modal ('N') with inline /recur and /policy shortcuts
│       └── Project Settings & Routine Edit Modal ('P' in Projects view)
│           ├── Edit Recurrence Rule (/recur or clear)
│           ├── Update Missed Policy (spike, accumulate, mark_done)
│           └── Project Rename & Archive
│
├── 4. Routine Anomaly Monitor & Telemetry Dashboard
│   ├── 4.1 "Today" Agenda & Active Routine Checklist (Tab [1] Top Section)
│   │   ├── Real-time status of routines due today (Pending vs. Done)
│   │   └── Fast Routine Completion Toggle (check-off without manual retyping)
│   ├── 4.2 Bi-Directional Telemetry Chart
│   │   ├── Upward Spikes (+Y, Red): Missed Due Routines
│   │   ├── Downward Bars (-Y, Yellow): Active Break Days
│   │   ├── Baseline & Dynamic Range Scaling
│   │   └── Interactive Focus Cursor (← / →, h / l)
│   ├── 4.3 Interactive Date Drilldown
│   │   ├── Mouse Click on chart column -> Jump to Date in Timeline
│   │   └── Keyboard 'Enter' on focused date -> Jump to Date in Timeline
│   ├── 4.4 System Health Metrics
│   │   └── State Indicator (● NORMAL, ● DEGRADED, ● OUTAGE)
│   ├── 4.5 Routine Backlog & Debt Ledger
│   │   └── Overdue entries owed by projects with 'accumulate' policy
│   ├── 4.6 Active Breaks Ledger
│   │   ├── Remaining days countdown & reason
│   │   └── Project-specific vs. Global scope
│   └── 4.7 Schedule Overview
│       └── Active project routines, recurrence rules & policies
│
├── 5. Periodic Reflections & Cadences
│   ├── 5.1 Temporal Cadences
│   │   ├── Weekly (YYYY-Www)
│   │   ├── Monthly (YYYY-MM)
│   │   ├── Quarterly (YYYY-Q#)
│   │   └── Yearly (YYYY)
│   ├── 5.2 Period Navigation & Review View
│   │   ├── Completion Status (MISSING, DRAFT, COMPLETED)
│   │   ├── Configurable Review Horizon (start_date)
│   │   └── Sub-Period Rollup (nested weekly within monthly, etc.)
│   └── 5.3 Reflection Content
│       ├── Automatic Entries Aggregation for the period
│       └── Reflection Markdown Editor ($EDITOR integration)
│
├── 6. Search & Recall Engine
│   ├── 6.1 Full-Text Search (SQLite FTS5)
│   │   ├── Indexed Journal Entries
│   │   ├── Indexed Project Markdown Documentation
│   │   └── Auto-synchronizing triggers on insert/update/delete
│   └── 6.2 Agent Episodic Memory & Recall (agent-entries)
│       ├── Headless CLI (journals agent capture/search)
│       ├── Segregated observation & runbook store
│       └── Priority Ranking Formula:
│           RankScore = MatchRelevance * (1 + log(1 + hit_time))
│
├── 7. Client & TUI Runtime
│   ├── 7.1 OpenTUI React Engine
│   │   ├── Keyboard Shortcuts & Vim Bindings
│   │   ├── Mouse Navigation (Header Tabs, Chart, Buttons)
│   │   └── Color Palettes (Rosé Pine Dawn, Nord, Tokyo Night, etc.)
│   ├── 7.2 Zero-Codegen Typed RPC
│   │   └── Hono client (hc<AppType>) sharing HTTP routes end-to-end
│   └── 7.3 Temporal & Lifecycle Preferences
│       ├── Configurable Day Rollover Cutoff (e.g. 03:00 AM late-night boundary)
│       └── Configurable Reflection Start Horizon & Keymaps
│
└── 8. Daemon & Process Architecture
    ├── 8.1 Standalone Daemon Mode
    │   └── 'journals start/stop/status' with PID tracking and health check
    └── 8.2 In-Process Development Mode
        └── 'bun run dev' in-process server with graceful signal cleanup
```

---

## 2. Feature Details Matrix

| Category | Primary Trigger / Key | Inputs | Outputs / Effects |
| :--- | :--- | :--- | :--- |
| **Quick Capture** | `n` (TUI) or desktop shortcut | Shorthand text: `@proj #tag /date YYYY-MM-DD /break 3d` | Creates atomic entry, auto-creates projects, schedules breaks, supports past-date logging |
| **Timeline View** | `2` or click `[2] Timeline` | Scroll `j`/`k`, jumps `t`, `[`/`]`, filter `/` | Chronological daily grouped cards, tags, breaks, soft-delete undo |
| **Projects View** | `3` or click `[3] Projects` | Selection `j`/`k`, content `e`, settings `P` | Markdown preview, note history, routine rule & policy editor |
| **Routine Dashboard** | `1` or click `[1] Dashboard` | `h`/`l`, click column, `Enter`, toggle `Space` | "Today" due checklist, 60-day bi-directional chart, debt ledger, breaks tracker |
| **Reflections** | Header click or keymap | Period selection, editor | Retrospectives grouped by week/month/quarter/year |
| **Search Engine** | `/` in views or API RPC | Search query string | Fast FTS5 bm25-ranked matches across notes & projects |
| **Agent CLI** | `journals agent <cmd>` | JSON/CLI flags | Subagent memory recording, observation logging, recall |

---

## 3. How to Link Related Features (Interlinking Strategies)

Connecting features turns isolated tools into an integrated daily workflow. Here are the 5 core linking mechanisms recommended for Journals:

```
                  ┌───────────────────────┐
                  │ 1. Routine Dashboard  │
                  │   (Spikes & Breaks)   │
                  └───────────┬───────────┘
                              │
          Click Spike / Date  │  Embed Routine Stats
                  ▼           ▼
┌───────────────────┐    ┌─────────────────────┐
│ 2. Timeline Stream│◄───┤ 3. Periodic Reviews │
│  (Daily Entries)  │    │    (Reflections)    │
└─────────┬─────────┘    └─────────────────────┘
          │                         ▲
Tag /     │ @project                │ [[Wikilinks]]
Mention   ▼                         │
┌───────────────────┐               │
│ 4. Projects &     ├───────────────┘
│    Routines       │
└───────────────────┘
```

### 1. Temporal Drilldown Linking (Implemented)
- **Dashboard ➔ Timeline**:
  - Clicking any date bar on the 60-day Routine Monitor immediately opens the Timeline filtered to `YYYY-MM-DD`.
  - *Effect*: If a spike (missed routine) or break is spotted, one click reveals what was logged (or missed) on that exact date.

### 2. Retrospective Rollup Linking (Recommended Next)
- **Timeline + Dashboard ➔ Periodic Reflections**:
  - When opening a weekly (`2026-W42`) or monthly (`2026-10`) reflection, automatically embed two linked context blocks:
    1. **Entry Rollup**: All journal entries created within that date range.
    2. **Routine Health Snapshot**: Habit completion rate (e.g. `Fitness: 85% on track, 2 debts accumulated, 3 break days`).
  - *Effect*: Weekly/monthly reviews are pre-populated with verifiable telemetry without manual data gathering.

### 3. Entity Wikilinks & Backlinks (`[[...]]`)
- **Entries ➔ Projects / Entries / Dates**:
  - Support Obsidian-style internal links in markdown bodies:
    - `[[@Fitness]]` links directly to that project's notebook.
    - `[[2026-10-23]]` links to that specific timeline day.
    - `[[2026-W43]]` links to that week's reflection.
  - In the Project and Reflection preview pane, show a **Backlinks** section listing all entries that referenced this entity.

### 4. Routine & Break Policy Coupling
- **Quick Capture `/break` ➔ Routine Engine & Dashboard**:
  - Entering `/break 3d` in quick capture without `@project` creates a **Global Break** that freezes debt accumulation for *all* routines.
  - Entering `@Fitness /break 3d` creates a **Project Break** that pauses only Fitness routines, leaving Deep-Work routines active.
  - *Effect*: Real-life interruptions (flu, vacation, sprained ankle) directly manipulate routine anomaly calculations without distorting consistency metrics.

### 5. Tag & Project Cross-Filtering
- **Timeline Tags ➔ Project Slices**:
  - Clicking or pressing `Enter` on `#tag` in Timeline filters notes across all projects carrying that tag.
  - Entering `@project #tag` in Quick Capture automatically indexes the entry under both the project hierarchy and the global tag taxonomy.

### 6. Human Journal <-> Agent Memory Bridge
- **Agent Entries (`agent-entries`) ➔ Project Documentation**:
  - When agents run automated workflows or coding tasks, they query human project notes (`@project`) for domain requirements and save operational runbooks into `agent-entries`.
  - Keeps agent tool execution traces separate from personal journal streams while sharing the project catalog as the single source of truth.
