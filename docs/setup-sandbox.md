# Local Setup Guide For Feedback (NixOS / Linux)

This guide explains how to run, update, and uninstall `journals` for daily production usage during active development, without modifying your global NixOS configuration.

---

## 1. Quick Setup (Executable Launcher)

A launcher script is placed in `~/.local/state/nix/profile/bin/journals` (and linked to `~/.local/bin/journals`) to provide the `journals` command globally in your terminal.

Whenever you rebuild NixOS or want to install/re-link it, run:

```bash
bun run install:bin
# Or run the script directly:
./scripts/install.sh
```

Verify the installation:

```bash
which journals
# Output: /home/nixos/.local/state/nix/profile/bin/journals

journals daemon status
journals agent --help
```

---

## 2. Configuration & Data Storage

- **Database**: `~/.local/share/journals/data.sqlite` (SQLite WAL mode enabled, persist across updates and garbage collection).
- **Configuration**: `~/.config/journals/config.yaml` or project root config.

Example `~/.config/journals/config.yaml`:

```yaml
server:
  host: "127.0.0.1"
  port: 4321
  db_path: "~/.local/share/journals/data.sqlite"
  wal_mode: true
  auto_start: true

quick_add:
  default_project: "Inbox"
```

With `auto_start: true` (default), any invocation of `journals`, `journals agent`, or the TUI automatically starts the background HTTP server daemon if it is not already running, so you never have to start it manually.

---

## 3. Daemon Management (`journals daemon`)

You can also inspect or manage the daemon server explicitly at any time:

```bash
# Check daemon status (PID, health, URL, logs)
journals daemon status

# Stop background server
journals daemon stop

# Start background server explicitly
journals daemon start

# Restart daemon
journals daemon restart
```

PID and logs are saved under:
- **PID File**: `~/.local/share/journals/server.pid`
- **Log File**: `~/.local/share/journals/server.log`

---

## 4. Updating During Active Development

Because the wrapper executes the built bundle directly from your repository:

1. Pull or edit your code in the repository.
2. Build the packages:
   ```bash
   bun run build
   ```
3. Your changes are live immediately for both you and your agents. No reinstall or Nix profile rebuilding needed.

---

## 5. Uninstallation

To remove `journals` cleanly without touching your system packages:

```bash
rm -f ~/.local/state/nix/profile/bin/journals
```

_(Your database at `~/.local/share/journals/` and configs at `~/.config/journals/` remain preserved unless manually deleted)._
