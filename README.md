# journals

Local-first journaling: a SQLite + Hono server behind an OpenTUI terminal client. Daily entries,
routine tracking, projects, and periodic reflections live in one local database.

## Quick start

```bash
bun install
bun run dev      # TUI against configs/journal.sandbox.yaml
bun run check    # format, lint, typecheck, tests, dead-code scan
bun test         # tests only
bun run deadcode # unused files, exports, and dependencies
```

`bun run install:bin` builds the packages and links the `journals` launcher; see the setup guide
for the daemon and storage paths.

## Docs

| Doc | Covers |
| :--- | :--- |
| [docs/setup-sandbox.md](docs/setup-sandbox.md) | Local install, daemon, storage, updates |
| [docs/tui-v2-decisions.md](docs/tui-v2-decisions.md) | Deliberate TUI choices (quit key, icons, chrome, contexts, error boundaries) |
| [docs/react-best-practices.md](docs/react-best-practices.md) | UI coding standards for the React/OpenTUI client |
| [docs/features-tree-tui.md](docs/features-tree-tui.md) | Generated feature map for the TUI |
| [docs/reviews/2026-10-tui-refactor.md](docs/reviews/2026-10-tui-refactor.md) | Historical refactor review and the fixes it drove |
| [GLOSSARY.md](GLOSSARY.md) | Domain terms (routines, missed policies, spikes, breaks, debts, reflections, slices) |
| [configs/journal.config.example.yaml](configs/journal.config.example.yaml) | Config reference; also the fallback when no user config exists |
