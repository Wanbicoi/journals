#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# On a machine where journals is deployed as a system service (nixconfig), the
# TUI comes from a declarative wrapper. Do not shadow it with a local one.
if [ -f /etc/journals/config.yaml ]; then
  echo "==> journals is deployed as a system service (journals.service)."
  echo "    Use the 'journals' wrapper from your system profile instead."
  exit 0
fi

echo "==> Building journals packages..."
cd "$REPO_DIR"
bun run build

TARGET_DIR="$HOME/.local/bin"
TARGET_BIN="$TARGET_DIR/journals"

mkdir -p "$TARGET_DIR"

echo "==> Installing launcher to $TARGET_BIN..."
cat << EOF > "$TARGET_BIN"
#!/usr/bin/env bash
REPO_DIR="$REPO_DIR"
exec /usr/bin/env bun "\$REPO_DIR/packages/client-tui/dist/index.js" "\$@"
EOF

chmod +x "$TARGET_BIN"

echo "==> Successfully installed journals!"
echo "    Path: $(which journals 2>/dev/null || echo "$TARGET_BIN")"
echo ""
echo "    Try running: journals daemon status"
