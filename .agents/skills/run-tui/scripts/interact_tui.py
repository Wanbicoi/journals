#!/usr/bin/env python3
"""
TUI Interaction Helper Script for Journals Repo.
Enables running the Journals TUI inside a virtual pseudo-terminal (PTY),
sending simulated keypresses, waiting for output, taking terminal text snapshots,
and cleanly exiting.

Usage:
  python3 interact_tui.py --keys "n" "my test note @Project #tag" "ENTER" "q"
  python3 interact_tui.py --interactive
  python3 interact_tui.py --snapshot
"""

import argparse
import fcntl
import os
import pty
import re
import struct
import sys
import termios
import time

ANSI_ESCAPE_RE = re.compile(r"\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])")

KEY_MAPPINGS = {
    "ENTER": "\r",
    "RETURN": "\r",
    "ESC": "\x1b",
    "ESCAPE": "\x1b",
    "TAB": "\t",
    "BACKSPACE": "\x7f",
    "UP": "\x1b[A",
    "DOWN": "\x1b[B",
    "RIGHT": "\x1b[C",
    "LEFT": "\x1b[D",
    "CTRL_C": "\x03",
    "CTRL_W": "\x17",
    "CTRL_U": "\x15",
}


def strip_ansi(text: str) -> str:
    """Remove ANSI escape sequences."""
    return ANSI_ESCAPE_RE.sub("", text)


def set_winsize(fd, rows=30, cols=100):
    winsize = struct.pack("HHHH", rows, cols, 0, 0)
    fcntl.ioctl(fd, termios.TIOCSWINSZ, winsize)


def run_session(actions, initial_wait=2.0, action_delay=0.4, dump_raw=False, rows=30, cols=100):
    """
    Spawns 'bun run dev:tui' inside a pty, executes given actions/keys,
    and returns (cleaned_screen_output, raw_bytes).
    """
    master, slave = pty.openpty()
    set_winsize(master, rows=rows, cols=cols)
    set_winsize(slave, rows=rows, cols=cols)

    env = os.environ.copy()
    env["TERM"] = "xterm-256color"
    env["FORCE_COLOR"] = "1"
    env["COLUMNS"] = str(cols)
    env["LINES"] = str(rows)

    pid = os.fork()
    if pid == 0:
        os.close(master)
        os.setsid()
        os.dup2(slave, 0)
        os.dup2(slave, 1)
        os.dup2(slave, 2)
        os.close(slave)
        # Execute dev:tui
        os.execvpe("bun", ["bun", "run", "dev:tui"], env)

    os.close(slave)

    # Set non-blocking on master
    flags = fcntl.fcntl(master, fcntl.F_GETFL)
    fcntl.fcntl(master, fcntl.F_SETFL, flags | os.O_NONBLOCK)

    full_output = b""

    def read_available():
        nonlocal full_output
        chunk = b""
        while True:
            try:
                data = os.read(master, 4096)
                if not data:
                    break
                chunk += data
                full_output += data
            except (BlockingIOError, OSError):
                break
        return chunk

    # Wait for initial render
    time.sleep(initial_wait)
    read_available()

    # Process actions
    for action in actions:
        if action.startswith("SLEEP:"):
            try:
                sec = float(action.split(":", 1)[1])
                time.sleep(sec)
            except ValueError:
                pass
            read_available()
            continue

        to_send = KEY_MAPPINGS.get(action.upper(), action)
        os.write(master, to_send.encode("utf-8"))
        time.sleep(action_delay)
        read_available()

    # Small settle time
    time.sleep(0.3)
    read_available()

    # Cleanup process if still running
    try:
        os.kill(pid, 0)
        # Send quit key if not already sent
        os.write(master, b"q")
        time.sleep(0.3)
        read_available()
    except OSError:
        pass

    try:
        os.close(master)
    except OSError:
        pass

    try:
        os.waitpid(pid, os.WNOHANG)
    except OSError:
        pass

    raw_text = full_output.decode("utf-8", errors="replace")
    clean_text = strip_ansi(raw_text)

    return clean_text, full_output


def main():
    parser = argparse.ArgumentParser(description="Journals TUI Test & Interaction Tool")
    parser.add_argument(
        "--keys",
        nargs="+",
        help="Sequence of keys or texts to send (e.g. --keys 1 j k n 'Hello note' ENTER q)",
        default=["q"],
    )
    parser.add_argument(
        "--wait",
        type=float,
        default=1.5,
        help="Initial wait seconds before sending keys (default: 1.5)",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.3,
        help="Delay seconds between keys (default: 0.3)",
    )
    parser.add_argument(
        "--snapshot",
        action="store_true",
        help="Render current state, wait 1.5s, capture snapshot and quit",
    )
    parser.add_argument(
        "--raw",
        action="store_true",
        help="Output raw terminal stream including ANSI codes",
    )

    args = parser.parse_args()

    actions = args.keys
    if args.snapshot:
        actions = ["q"]

    clean_text, raw_bytes = run_session(
        actions, initial_wait=args.wait, action_delay=args.delay, dump_raw=args.raw
    )

    if args.raw:
        sys.stdout.buffer.write(raw_bytes)
    else:
        # Filter and show readable text lines
        lines = [line.strip() for line in clean_text.splitlines() if line.strip()]
        print("\n".join(lines))


if __name__ == "__main__":
    main()
