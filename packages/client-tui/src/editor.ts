import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function openExternalEditor(initialContent: string): string {
  // Respect user preference: $EDITOR -> $VISUAL -> nvim -> nano
  const editor = process.env.EDITOR || process.env.VISUAL || "nvim" || "nano";
  const tmpFile = path.join(os.tmpdir(), `journal-project-${Date.now()}.md`);

  try {
    fs.writeFileSync(tmpFile, initialContent, "utf-8");

    // Temporarily surrender terminal raw mode to editor
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }

    spawnSync(editor, [tmpFile], {
      stdio: "inherit",
    });

    const updatedContent = fs.readFileSync(tmpFile, "utf-8");
    return updatedContent;
  } finally {
    if (fs.existsSync(tmpFile)) {
      fs.unlinkSync(tmpFile);
    }
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
  }
}
