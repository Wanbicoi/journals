import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function resolveEditor(): string {
  if (process.env.EDITOR) return process.env.EDITOR;
  if (process.env.VISUAL) return process.env.VISUAL;

  const candidates = ["nano", "nvim", "vim", "vi"];
  for (const cmd of candidates) {
    try {
      const res = spawnSync("which", [cmd], { stdio: "ignore" });
      if (res.status === 0) return cmd;
    } catch {
      // Continue searching
    }
  }
  return "nano";
}

export function openExternalEditor(initialContent: string): string {
  const editor = resolveEditor();
  const tmpFile = path.join(os.tmpdir(), `journal-project-${Date.now()}.md`);

  try {
    fs.writeFileSync(tmpFile, initialContent, "utf-8");

    // Temporarily surrender terminal raw mode to editor
    if (process.stdin.isTTY) {
      process.stdin.setRawMode?.(false);
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
      process.stdin.setRawMode?.(true);
    }
  }
}
