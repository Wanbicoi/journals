import { spawn } from "node:child_process";
import type { CliRenderer } from "@opentui/core";

/**
 * Copies the provided text to system clipboard and terminal OSC 52.
 */
export async function copyToClipboard(text: string, renderer?: CliRenderer): Promise<boolean> {
  if (!text) return false;

  // 1. Terminal OSC 52 sequence (works across SSH, tmux, and modern terminal emulators)
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

        // Handle both process error and stream EPIPE / broken pipe errors safely
        p.on("error", () => resolve(false));
        p.stdin?.on("error", () => resolve(false));

        p.on("close", (code) => resolve(code === 0));

        if (p.stdin) {
          p.stdin.write(text, () => {
            p.stdin?.end();
          });
        }
      } catch {
        resolve(false);
      }
    });
  };

  // Try standard system clipboards with error handling
  await pipeToTool("wl-copy", []);
  await pipeToTool("xclip", ["-selection", "clipboard"]);
  await pipeToTool("xsel", ["--clipboard", "--input"]);
  await pipeToTool("pbcopy", []);

  return true;
}
