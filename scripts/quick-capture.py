#!/usr/bin/env python3
import json
import tkinter as tk
from tkinter import messagebox
import urllib.request
import urllib.error

SERVER_URL = "http://127.0.0.1:4321/capture"

def submit(note_text, root):
    raw = note_text.strip()
    if not raw:
        root.destroy()
        return

    payload = json.dumps({"raw": raw}).encode("utf-8")
    req = urllib.request.Request(
        SERVER_URL,
        data=payload,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=3) as resp:
            pass
        root.destroy()
    except Exception as e:
        messagebox.showwarning(
            "Journals Server Offline",
            f"Could not connect to {SERVER_URL}.\nMake sure the server is running in WSL (e.g. 'bun run dev:server').\n\nError: {e}"
        )
        root.destroy()

def main():
    root = tk.Tk()
    root.title("Journals Quick Capture")
    root.attributes("-topmost", True)
    root.resizable(False, False)
    root.configure(bg="#181825")

    # Dimensions & centering
    width, height = 540, 110
    screen_width = root.winfo_screenwidth()
    screen_height = root.winfo_screenheight()
    x = int((screen_width - width) / 2)
    y = int((screen_height - height) / 2)
    root.geometry(f"{width}x{height}+{x}+{y}")

    # Label
    label = tk.Label(
        root,
        text="⚡ Quick Capture  (Enter: submit | Esc: cancel)",
        fg="#cdd6f4",
        bg="#181825",
        font=("Segoe UI", 10)
    )
    label.pack(anchor="w", padx=16, pady=(12, 6))

    # Entry Box
    entry = tk.Entry(
        root,
        fg="#cdd6f4",
        bg="#313244",
        insertbackground="#cdd6f4",
        relief="flat",
        font=("Segoe UI", 12),
        highlightthickness=1,
        highlightbackground="#585b70",
        highlightcolor="#89b4fa"
    )
    entry.pack(fill="x", padx=16, ipady=4)
    entry.focus_set()

    # Key bindings
    root.bind("<Return>", lambda e: submit(entry.get(), root))
    root.bind("<KP_Enter>", lambda e: submit(entry.get(), root))
    root.bind("<Escape>", lambda e: root.destroy())

    # Bring to foreground on Windows
    root.lift()
    root.focus_force()

    root.mainloop()

if __name__ == "__main__":
    main()
