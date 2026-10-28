# Domain Glossary

Reference definitions and operational semantics for the Journals system.

## Routines & Telemetry

### Project
A named collection of journal entries with markdown documentation. Projects can act as static notebooks or recurring routines.

### Routine
A project with an RFC 5545 `recurrence` rule (e.g., `FREQ=DAILY`, `INTERVAL=2;FREQ=DAILY`, `FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR`). Evaluated across a rolling 60-day window to monitor daily habits and discipline.

### Missed Policy
The rule governing how a routine behaves when due on a date with no journal entry logged:
- **`spike`** (default): Registers a missed occurrence on that date. Generates a visual monitor spike without persistent debt.
- **`accumulate`**: Adds +1 to overdue debt for each missed date. Debt persists in the backlog until made up.
- **`mark_done`**: Forgives missed dates without accumulating debt or raising alerts.

### Spike
An upward (+Y) red/orange bar on the routine anomaly monitor indicating due routines that received no journal entries on that calendar day.

### Overdue Debt
The accumulated tally of missed routine obligations for projects using `missedPolicy: accumulate`. Active breaks freeze debt accrual during pause intervals.

### Break (`breakDays`)
An intentional pause lasting $N$ consecutive days starting from entry `createdAt`. Represented as a downward (-Y) bar on the monitor. Freezes routine tracking and debt accumulation:
- **Project Break**: Attached to an explicit `/project:` command. Pauses only that project's routine.
- **Global Break**: Has `projectId: null` (no project assigned). Pauses all project routines system-wide.

---

## Data Model & Capture

### Entry
An atomic journal record storing markdown text, tags, creation timestamp, and optional `breakDays`.
- **Project Entry**: Associated with a specific `projectId`.
- **Global Entry**: `projectId: null`. Used for system-wide break declarations and cross-project notes.

### Quick Capture
Single-line capture syntax parsed into structured records:
- `/project:<name>`: Reassigns or creates the target project. Quote names with spaces: `/project:"My Project"`.
- `/tag:<tag>`: Associates a normalized tag. Repeat the command for multiple tags.
- `/break:<N>d` (or `/break:<N>`): Sets break duration in days and defaults `projectId` to `null` if no `/project:` is specified.
- `/date:<YYYY-MM-DD|today|yesterday>`: Sets the entry timestamp.

Removed syntax: `@project`, `#tag`, and bare `/yesterday` are ordinary note text.

---

## Reflections & Review

### Periodic Reflection
A recurring retrospective document anchored to a calendar cadence (`weekly`, `monthly`, `quarterly`, `yearly`). Summarizes completed entries and smaller sub-period reflections to facilitate iterative review.

### Period Key
The canonical string identifier for a reflection period:
- **`weekly`**: `YYYY-Www` (e.g., `2026-W42`)
- **`monthly`**: `YYYY-MM` (e.g., `2026-10`)
- **`quarterly`**: `YYYY-Q#` (e.g., `2026-Q4`)
- **`yearly`**: `YYYY` (e.g., `2026`)

### Sub-Reflection
A nested reflection roll-up from smaller child periods within an active parent period (e.g., weekly reflections nested within a monthly reflection).

---

## Architecture & Runtime

### Vertical Slice
Feature-oriented backend module in `packages/server/src/slices/<feature>/` (`entries`, `projects`, `quick-capture`, `tags`, `agent-entries`, `analytics`). Each slice houses its own database handlers, schemas, and routes.

### Agent Entries
Dedicated storage slice (`agent-entries`) and CLI (`journals agent`) for autonomous agents to record episodic observations, procedural runbooks, and tool call traces. Kept distinct from human journal entries.

### Zero-Codegen RPC
End-to-end typed HTTP client in `packages/client-tui/src/api/client.ts` using Hono's `hc<AppType>`, sharing route types without build code generation.

### In-Process Server
Development execution mode (`bun run dev`) where the Hono HTTP server starts within the active TUI process. Silently cleans up on `SIGINT`, `SIGTERM`, and normal exit, preventing background daemon retention.
