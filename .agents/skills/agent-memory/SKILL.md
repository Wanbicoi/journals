---
name: agent-memory
description: >-
  Use this skill to log, search, retrieve, and track agent memory (episodic runtime traces
  and procedural how-to recipes) using the `journals agent` CLI.
---

# Agent Memory System (`journals agent`)

This skill provides instructions for AI agents to interact with the persistent memory store in Journals. It allows agents to record runtime experiences (Episodic) and repeatable workflows (Procedural), search for existing solutions using full-text search (FTS5), inspect full note details, and prioritize high-frequency solutions via `hit` counters.

---

## 1. Core Concepts

Agent memory entries are stored in a dedicated `agent_entries` table separate from user journal notes.

- **Episodic Memory**: Run-time observations, error stack traces, execution context, transient debugging discoveries.
- **Procedural Memory**: Step-by-step recipes, build/deploy instructions, runbooks, and repeatable commands.
- **Hit Time (`hit_time`)**: Frequency counter representing how many times a procedure or note solved/matched a task. Higher `hit_time` boosts entry ranking in search results.

---

## 2. CLI Command Reference

All commands are executed via the unified binary or bun runner:

```bash
bun packages/client-tui/src/index.tsx agent <command> [options] [arguments...]
# or if built / linked:
journals agent <command> [options] [arguments...]
```

### A. Logging Memory (`log`)

Record an episodic or procedural note into memory.

```bash
# Log a procedural recipe under a project
bun packages/client-tui/src/index.tsx agent log --project Build "[procedural] How to build the monorepo:
Step 1: bun run build:core
Step 2: bun run build:server
Step 3: bun test"

# Log an episodic debugging observation
bun packages/client-tui/src/index.tsx agent log --project DevOps "[episodic] Container exit code 137 was caused by Node memory limit. Resolved by setting NODE_OPTIONS=--max-old-space-size=4096."
```

- `--project, -p <name>`: Target project (defaults to `Agent` if omitted).
- Recommended: Label your content with `[episodic]` or `[procedural]` headers for search clarity.

### B. Searching Memory (`search`)

Perform multi-term and pattern FTS5 full-text search across agent entries. Results display matched lines with surrounding context window lines and are boosted by `hit_time`.

```bash
# Multi-term keyword search
bun packages/client-tui/src/index.tsx agent search build test

# Custom result limit
bun packages/client-tui/src/index.tsx agent search "exit code 137" --limit 5
```

### C. Boosting Solution Priority (`hit`)

When a searched entry or known procedure successfully solves a problem or matches a recurring task, **increment its `hit_time`**:

```bash
# Increment hit count for one or multiple entry IDs
bun packages/client-tui/src/index.tsx agent hit <id1> [id2...]
```

*Entries with higher hit counts receive priority weighting in future search results.*

### D. Inspecting Entries (`show`)

Fetch and inspect full note content and metadata for one or more entry IDs.

```bash
# Human-readable view
bun packages/client-tui/src/index.tsx agent show <id1> <id2>

# JSON output (for automated parsing)
bun packages/client-tui/src/index.tsx agent show <id> --json
```

### E. Listing Recent Entries (`list`)

List recent agent entries sorted by hit priority and recency.

```bash
# List recent 20 entries
bun packages/client-tui/src/index.tsx agent list

# Filter by project and limit
bun packages/client-tui/src/index.tsx agent list --project Architecture --limit 10

# Output as JSON
bun packages/client-tui/src/index.tsx agent list --json
```

---

## 3. Best Practices for Agents

1. **Check Before Acting**: At the start of a debugging or complex setup task, query existing memory:
   ```bash
   bun packages/client-tui/src/index.tsx agent search "<error message or tool name>"
   ```
2. **Reinforce Working Solutions**: Whenever an existing memory entry provides the solution, run `journals agent hit <id>` to strengthen its rank.
3. **Record New Discoveries**: After solving a tricky bug or establishing a new multi-step recipe, log it as `[episodic]` or `[procedural]` with clean markdown.
