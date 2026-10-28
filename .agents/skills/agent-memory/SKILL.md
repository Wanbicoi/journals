---
name: agent-memory
description: >-
  Record, search, inspect, and reinforce agent memory (fixes, root causes, and
  runbooks) using the `journals agent` CLI.
---

# Agent Memory (`journals agent`)

Persistent cross-session memory for AI agents. Record fixes and recipes, search previous solutions, and boost verified answers.

## Entry Format

Every entry uses one template. The issue description stays short — one line on the symptom, then cause, then resolution:

```
<title>: <one-line description of the issue>
Cause: <root cause> — why it happened (the change or condition that introduced it)
Resolution: <fix>
```

- **Cause**: name the root cause and the reason behind it, not just the surface error. If an earlier change introduced it, name that change.
- **Resolution**: what was done to fix it. For a repeatable recipe, write the resolution as numbered steps.

---

## Commands

Executable via `journals agent <command>:

### Search Memory (`search`)
Search solutions before starting debugging or complex tasks:
```bash
journals agent search <query...> [--limit <n>] [--include-superseded]
```

### Reinforce Solutions (`hit`)
When an existing entry or recipe successfully solves your task, log a hit with the reason it helped. Hits boost its ranking in future searches:
```bash
journals agent hit <id...> --note "<why it helped>"
```

### Record New Memory (`log`)
Save a validated fix or recipe:
```bash
journals agent log [--project <name>] [--supersedes <ids>] "<title>: <symptom>
Cause: <root cause> — <why it happened>
Resolution: <fix>"
```
*(`--supersedes` retires stale entries in the same project; omit `--project` to inherit the superseded entry's project, or fall back to `Agent`.)*

### Inspect & List (`show`, `list`)
```bash
journals agent show <id...> [--json]
journals agent list [--project <name>] [--limit <n>] [--include-superseded] [--json]
```

---

## Agent Workflow

1. **Recall**: Search memory for prior solutions to unfamiliar errors, build steps, or commands (`journals agent search "<error or task>"`).
2. **Reinforce**: When a returned entry solves the issue, run `journals agent hit <id> --note "<why it helped>"`.
3. **Record**: Log new fixes and repeatable recipes so future agents inherit them.
4. **Consolidate**: When a note is stale, log the merged replacement with `--supersedes <old-id...>`.
