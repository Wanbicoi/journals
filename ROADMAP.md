---
kanban-plugin: basic
---

# Journals Roadmap

## 🚀 Now
- [x] Global shortcut quick capture script (AutoHotkey v2 resident popup + Python/PowerShell fallbacks)
- [ ] Daemon runner & service setup (`systemd --user` unit + on-demand auto-spawn fallback)
- [ ] CLI capture command / flags (e.g. `journals capture "quick note"`)
- [ ] Filter by date in timeline view

## 📋 Next
- [ ] Automated installer script (`install.sh`) with daemon setup detection
- [ ] Decouple Client/CLI from Server Auto-Spawn in Dev Mode:
  - Prevent `EADDRINUSE` port 4321 conflicts and DB migration race conditions when running multiple dev TUIs/CLIs.
  - Disable in-process server `auto_start` in dev mode; prompt user to start `bun run dev:server` or use lockfile-based single-instance guard.
- [x] Full-text search (SQLite FTS5) across timeline entries and markdown projects
- [x] TUI search bar & filters (filter per tab: timeline & projects)
- [ ] Multi-line entry editing via `$EDITOR` / temporary file

## 💡 Ideas / Backlog
- [ ] Agent Search Ranking & Memory Recall:
  - FTS5 multi-pattern retrieval with dynamic `hit_time` priority multiplier:
    $$\text{Rank Score} = \text{MatchRelevance} \times (1 + \log(1 + \text{hit\_time}))$$
  - High `hit_time` solutions automatically surface first for recurring agent tasks/errors.
  - Contextual window multi-match snippet extraction across long entries.
- [ ] Export & backup engine (export to Obsidian/Logseq daily markdown files, JSON dump)
- [ ] WebSocket / SSE live event stream for syncing multiple running clients
- [ ] Native zero-dependency desktop popup prompt
- [ ] Encrypted cross-device sync engine (Git / WebDAV)
- [ ] Audio note / transcription capture integration

## ✅ Done
- [x] Initial Monorepo architecture (Bun workspace, Hono, Drizzle ORM, SQLite)
- [x] OpenTUI React Terminal Client (Timeline stream & Project preview)
- [x] Vertical slice HTTP backend (`/capture`, `/entries`, `/projects`, `/tags`)
- [x] Project and tag inline auto-suggestion engine
