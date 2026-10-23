#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "==> Building journals packages..."
cd "$REPO_DIR"
bun run build

TARGET_DIR="$HOME/.local/state/nix/profile/bin"
TARGET_BIN="$TARGET_DIR/journals"

mkdir -p "$TARGET_DIR"

echo "==> Installing launcher to $TARGET_BIN..."
cat << 'EOF' > "$TARGET_BIN"
#!/usr/bin/env bash
REPO_DIR="/home/nixos/Repos/journals"
exec /usr/bin/env bun "$REPO_DIR/packages/client-tui/dist/index.js" "$@"
EOF

chmod +x "$TARGET_BIN"

# Also symlink to ~/.local/bin as a fallback if present
if [ -d "$HOME/.local/bin" ]; then
  ln -sf "$TARGET_BIN" "$HOME/.local/bin/journals"
fi

echo "==> Successfully installed journals!"
echo "    Path: $(which journals 2>/dev/null || echo "$TARGET_BIN")"
echo ""
echo "    Try running: journals daemon status"
