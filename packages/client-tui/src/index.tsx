#!/usr/bin/env node
import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { App } from "./views/App.js";

async function main() {
  if (!process.stdin.isTTY) {
    console.error(
      "Error: Journals TUI requires an interactive TTY terminal.\n" +
        "To test or interact headlessly, use the automated interaction script:\n" +
        '  python3 .agents/skills/run-tui/scripts/interact_tui.py --keys "1" "q"\n',
    );
    process.exit(1);
  }

  const renderer = await createCliRenderer({
    exitOnCtrlC: true,
  });

  const root = createRoot(renderer);
  root.render(<App />);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
