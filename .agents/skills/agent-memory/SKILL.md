---
name: agent-memory
description: >-
  Record, search, inspect, reinforce, and consolidate agent memory (fixes, root
  causes, and runbooks) using the `journals agent` CLI.
---

# Agent Memory (`journals agent`)

Persistent cross-session memory for AI agents. Entries hold validated fixes and
recipes, hits are append-only evidence that an entry helped, and consolidation
retires stale notes without losing their history.

## Entry Format

Every entry uses one template. The issue description stays short — one line on the symptom, then cause, then resolution:

```
<title>: <one-line description of the issue>
Cause: <root cause> — why it happened (the change or condition that introduced it)
Resolution: <fix>
```

- **Cause**: name the root cause and the reason behind it, not just the surface error. If an earlier change introduced it, name that change.
- **Resolution**: what was done to fix it. For a repeatable recipe, write the resolution as numbered steps.

A hit note is separate from the entry: one short sentence saying what the entry
unblocked (for example, `Rebuilding the lockfile fixed the CI cache miss`). Hit
notes are displayed by `show` but are not full-text indexed.

---

## Commands

Executable via `journals agent <command>`:

### Search Memory (`search`)
Search solutions before starting debugging or complex tasks:
```bash
journals agent search <query...> [--limit <n>] [--include-superseded]
```

- Searches entry content only, not hit notes.
- Only the newest version of a chain is searched. Add `--include-superseded`
  when you need older versions; `show` can always reach them by id.

### Reinforce Solutions (`hit`)
When an existing entry or recipe successfully solves your task, log a hit with
the reason it helped. Hits boost its ranking in future searches:
```bash
journals agent hit <id...> --note "<why it helped, what related>"
```

- `--note` is required and must be non-empty; it is stored with the hit.
- Multiple ids share one note. Duplicate ids are logged once.
- An unknown id aborts the whole call and writes nothing.
- Hitting a superseded version is allowed, but it stays out of search results.
- A replacement starts at zero hits. Supersede first, then hit the entry that
  actually helped; old hits stay on the old version.

### Record New Memory (`log`)
Save a validated fix or recipe:
```bash
journals agent log [--project <name>] [--supersedes <id>] "<title>: <symptom>
Cause: <root cause> — <why it happened>
Resolution: <fix>"
```

- `--supersedes` takes exactly one id: the current newest version this note
  replaces. History is linear; you cannot fork from an older version.
- The previous entry must belong to the project the new entry lands in;
  cross-project replacement is rejected.
- Without `--project`, the new entry inherits the previous entry's project.
  With no previous entry it falls back to `Agent`.
- Write the merged content into the new entry. Old content is never rewritten;
  the old row keeps its history and gains a `superseded by` link.
- A missing or unknown id, or a predecessor that already has a successor,
  aborts the call; nothing is created.

### Inspect & List (`show`, `list`)
```bash
journals agent show <id...> [--json]
journals agent list [--project <project-id>] [--limit <n>] [--include-superseded] [--json]
```

- `show` prints the derived hit count, `Previous`, `Superseded by`, and every
  hit log with its note, newest first, followed by the full entry content.
  `--json` returns `hitCount`, `previousEntryId`, `supersededByEntryId`, and `hitLogs`.
- `list` orders by live hit count and then recency, and hides every non-newest
  version unless `--include-superseded` is passed. `--project` filters by project id.

---

## Agent Workflow

1. **Recall**: Search memory for prior solutions to unfamiliar errors, build steps, or commands (`journals agent search "<error or task>"`).
2. **Reinforce**: When a returned entry solves the issue, run `journals agent hit <id> --note "<why it helped, what related>"`.
3. **Record**: Log new fixes and repeatable recipes so future agents inherit them.
4. **Supersede**: When a note is stale or need to be updated, `show` the current newest version, write one replacement, and pass that version's id as `--supersedes <id>`. Only the newest version stays searchable; older versions remain reachable by id.
