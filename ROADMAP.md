---
kanban-plugin: basic
---

# Journals Roadmap

## 🚀 Now
- [ ] Global shortcut quick capture script (popup via rofi/wofi/zenity/terminal fallback)
- [ ] Daemon runner & service setup (`systemd --user` unit + on-demand auto-spawn fallback)
- [ ] CLI capture command / flags (e.g. `journals capture "quick note"`)

## 📋 Next
- [ ] Automated installer script (`install.sh`) with daemon setup detection
- [ ] Full-text search (SQLite FTS5) across timeline entries and markdown projects
- [ ] TUI search bar & filters (filter by date range, tag, or project)
- [ ] Multi-line entry editing via `$EDITOR` / temporary file

## 💡 Ideas / Backlog
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
