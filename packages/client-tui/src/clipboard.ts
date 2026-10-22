import { spawn } from "node:child_process";
import type { CliRenderer } from "@opentui/core";

/**
 * Copies the provided text to system clipboards and terminal OSC 52.
 */
export async function copyToClipboard(text: string, renderer?: CliRenderer): Promise<boolean> {
  if (!text) return false;

  // 1. Try terminal OSC 52 escape sequences if renderer is available
  try {
    if (renderer?.copyToClipboardOSC52) {
      renderer.copyToClipboardOSC52(text);
    }
  } catch {}

  // 2. Safe helper to pipe to external clipboard CLI tools
  const pipeToTool = (cmd: string, args: string[]): Promise<boolean> => {
    return new Promise((resolve) => {
      try {
        const p = spawn(cmd, args, { stdio: ["pipe", "ignore", "ignore"] });
        p.on("error", () => resolve(false));
        p.on("close", (code) => resolve(code === 0));
        p.stdin?.write(text);
        p.stdin?.end();
      } catch {
        resolve(false);
      }
    });
  };

  // Try standard system clipboards (Wayland, X11, WSL/Windows, macOS)
  pipeToTool("wl-copy", []);
  pipeToTool("xclip", ["-selection", "clipboard"]);
  pipeToTool("xsel", ["--clipboard", "--input"]);
  pipeToTool("clip.exe", []);
  pipeToTool("pbcopy", []);

  return true;
}
