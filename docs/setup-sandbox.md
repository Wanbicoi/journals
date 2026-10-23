# Local Setup (NixOS / Linux)

Run `journals` during local development without altering system packages.

## 1. Install / Re-link

Whenever you rebuild NixOS or switch profiles:

```bash
bun run install:bin
```

This builds the packages and links the launcher to `~/.local/state/nix/profile/bin/journals`.

## 2. Usage & Daemon

The background server daemon starts automatically on first run (`auto_start: true`).

Manage the daemon manually if needed:

```bash
journals daemon status
journals daemon start
journals daemon stop
journals daemon restart
```

## 3. Storage & Config

- **Config**: `~/.config/journals/config.yaml`
- **Data & Logs**: `~/.local/share/journals/` (`data.sqlite`, `server.pid`, `server.log`)

## 4. Updates & Uninstall

- **Update code**: `bun run build` (changes apply immediately).
- **Uninstall**: `rm -f ~/.local/state/nix/profile/bin/journals`
