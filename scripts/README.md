# Windows Quick Capture Setup Guide

This guide explains how to bind a global hotkey on Windows (e.g. `Ctrl + Alt + J`) that brings up an instant popup to quick-capture notes directly into your Journals server running inside WSL.

---

## Script Location
The PowerShell capture script is located at:
```text
\\wsl.localhost\NixOS\home\nixos\Repos\journals\scripts\quick-capture.ps1
```

---

## Setup Steps (No Extra Software Required)

### 1. Create a Windows Shortcut
1. Open Windows File Explorer and navigate to:
   ```text
   \\wsl.localhost\NixOS\home\nixos\Repos\journals\scripts
   ```
2. Right-click on `quick-capture.ps1` and select **Show more options** → **Create shortcut**.
   *(If Windows asks to place it on the Desktop, click Yes)*.

### 2. Configure Shortcut Properties
1. Right-click the newly created shortcut and click **Properties**.
2. In the **Shortcut** tab:
   - Change **Target** to:
     ```text
     powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File "\\wsl.localhost\NixOS\home\nixos\Repos\journals\scripts\quick-capture.ps1"
     ```
   - Click into the **Shortcut key** field and press your preferred key combination:
     - Recommended: `Ctrl + Alt + J`
   - Change **Run** dropdown to: **Minimized** (this prevents any black console window from flashing).
3. Click **Apply** and **OK**.

> **Note for Windows Hotkeys:** Windows requires shortcuts with hotkeys to be located on your **Desktop** or in your **Start Menu** (`%APPDATA%\Microsoft\Windows\Start Menu\Programs`). If you move the shortcut file to either of those folders, Windows registers the hotkey immediately.

---

## Testing
1. Make sure your server is running in WSL (`bun run dev:server`).
2. Press your hotkey (`Ctrl + Alt + J`).
3. Type a note (e.g. `Buy groceries @Personal #errands`) and hit **Enter**.
4. It will immediately be saved to SQLite and show up on your timeline.
