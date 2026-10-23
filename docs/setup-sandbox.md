# Local Setup Guide For Feedback (NixOS / Linux)

This guide explains how to run, update, and uninstall `journals` for daily production usage during active development, without modifying your global NixOS configuration.

---

## 1. Quick Setup (Executable Launcher)

A launcher script placed in `~/.local/state/nix/profile/bin/journals` enables the `journals` command globally in your terminal (since `~/.local/state/nix/profile/bin` is already part of your `$PATH` on NixOS).

### Installation Command

Run this once:

```bash
mkdir -p ~/.local/state/nix/profile/bin
cat << 'EOF' > ~/.local/state/nix/profile/bin/journals
#!/usr/bin/env bash
REPO_DIR="/home/nixos/Repos/journals"
exec /usr/bin/env bun "$REPO_DIR/packages/client-tui/dist/index.js" "$@"
EOF
chmod +x ~/.local/state/nix/profile/bin/journals
```

Verify the installation:

```bash
which journals
# Output: /home/nixos/.local/state/nix/profile/bin/journals

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

With `auto_start: true`, running `journals` or `journals agent` automatically starts the background HTTP server daemon if it is not already running.

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
