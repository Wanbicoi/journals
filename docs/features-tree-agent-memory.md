# journals.cli.agent.dispatch — Dispatch an agent memory subcommand

```text
Dispatch an agent memory subcommand
├── 1. Record a fix or runbook entry
│   └── 1.1. Create an agent entry
│       └── 1.1.1. Log an agent entry
│           ├── 1.1.1.1. Validate the previous version
│           └── 1.1.1.2. Find or create the target project
├── 2. Search agent memory
│   └── 2.1. Search agent entries
│       └── 2.1.1. Search the FTS5 index
│           ├── 2.1.1.1. Sanitize the FTS5 query
│           └── 2.1.1.2. Build the context preview
├── 3. Inspect entries by id
│   ├── 3.1. Fetch agent entries by id
│   │   └── 3.1.1. Load the entries by id
│   └── 3.2. Format the entry detail
├── 4. Reinforce entries that solved a task
│   └── 4.1. Log the hit
│       └── 4.1.1. Write the hit log
└── 5. List recent entries
    └── 5.1. List agent entries
        └── 5.1.1. Read the recent entries
```

**Notes**

- **Create an agent entry over HTTP** — Posts the whole note as one content string, plus the id of the
  version it replaces; the server resolves the project and links the chain.
- **Dispatch an agent memory subcommand** — citty resolves the first positional token to exactly one of the
  five subcommands, so the tree lists every branch the dispatcher can take.
- **Record a fix or runbook entry** — Rejoins any unquoted trailing tokens into one content string and
  links the note to the one version named by --supersedes.
- **Search agent memory** — Prints the contextual preview when the server produced one,
  otherwise the FTS snippet or the first 140 characters of the note.
- **Log an agent entry** — Inserts the note verbatim under the resolved project. The
  title/Cause/Resolution layout is a convention for agents, not parsed here.
  A replacement cites exactly one previous version, so history stays linear.
- **Load entries by id** — Supersession is derived in both directions: `previousEntryId` walks
  back one version, `supersededByEntryId` points at the successor, if any.
- **Log a hit** — Writes one row per distinct id with the same timestamp. The note is
  required, and an unknown id fails the whole batch before anything is written.
- **List recent entries** — A project filter is optional; without one the list spans every
  project. Only the newest version of each chain is shown unless
  includeSuperseded is set.
- **Build the context preview** — Extracts line-based context around matched words or patterns and
  supports multiple distinct matching clusters with context lines around
  each. Groups matching lines into up to three clusters with two context
  lines on each side, so a long note condenses to the passages that matched.
- **Validate the previous version** — History is linear: the predecessor must exist, and no other entry
  may already point at it. Superseding a stale version is rejected with a
  pointer to the current one.
- **Search agent entries** — Ranks with BM25 weighted by (1 + 0.5 × hit count), so a reinforced
  entry outranks a fresher but unproven one at the same relevance. Only the
  newest version of each chain is searched unless includeSuperseded is set.
- **Sanitize the FTS5 query** — Strips every character that is not a letter, number, underscore, or
  space, then wraps each token as a quoted prefix term, so punctuation in a
  pasted error message cannot break the FTS5 syntax.
