---
name: agent-memory
description: >-
  Record, search, inspect, and reinforce agent memory (episodic runtime observations
  and procedural runbooks) using the `journals agent` CLI.
---

# Agent Memory (`journals agent`)

Persistent cross-session memory for AI agents. Record runbooks and debugging observations, search previous solutions, and boost verified answers.

## Memory Types

- **Episodic**: Runtime context, transient error stack traces, root cause findings. Tag content with `[episodic]`.
- **Procedural**: Repeatable recipes, build/deploy instructions, runbooks. Tag content with `[procedural]`.

---

## Commands

Executable via `journals agent <command>` (or `bun packages/client-tui/src/index.tsx agent <command>`):

### Search Memory (`search`)
Search solutions before starting debugging or complex tasks:
```bash
journals agent search <query...> [--limit <n>]
```

### Reinforce Solutions (`hit`)
When an existing entry or recipe successfully solves your task, increment its hit counter to boost its ranking in future searches:
```bash
journals agent hit <id...>
```

### Record New Memory (`log`)
Save a validated recipe or debugging discovery:
```bash
# Procedural runbook
journals agent log --project <name> "[procedural] <title>
Step 1: ...
Step 2: ..."

# Episodic observation
journals agent log --project <name> "[episodic] <error/cause/resolution>"
```
*(Defaults to project `Agent` if `--project` is omitted.)*

### Inspect & List (`show`, `list`)
```bash
journals agent show <id...> [--json]
journals agent list [--project <name>] [--limit <n>] [--json]
```

---

## Agent Workflow

1. **Recall**: Search memory for prior solutions to unfamiliar errors, build steps, or commands (`journals agent search "<error or task>"`).
2. **Reinforce**: When a returned entry solves the issue, run `journals agent hit <id>`.
3. **Record**: Log new solutions and multi-step recipes so future agents inherit them.
