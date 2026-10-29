# Windows app backup (winget)

A snapshot of the apps installed on this Windows machine, plus scripts to rebuild
them on a fresh install. Everything here is generated with `winget`, so it stays
reproducible without hand-maintaining a package list.

## Files

| File | Purpose |
| :--- | :--- |
| [`winget-packages.json`](winget-packages.json) | Versionless export used by `install-apps.ps1` (56 packages: 55 from `winget`, 1 from `msstore`). |
| [`winget-packages.versions.json`](winget-packages.versions.json) | Same list with the exact installed versions, for reference only. |
| [`installed-apps.txt`](installed-apps.txt) | Full `winget list` snapshot, including store/MSIX/ARP apps that `winget export` cannot capture. Use it as the manual checklist. |
| [`install-apps.ps1`](install-apps.ps1) | Installs everything from `winget-packages.json`. |
| [`export-apps.ps1`](export-apps.ps1) | Refreshes the three files above after installing or removing apps. |

## New machine

1. Install **App Installer** (provides `winget`). It ships with Windows 11; on
   Windows 10 get it from https://apps.microsoft.com/detail/9nblggh4nns1 or run:
   ```powershell
   winget install --id Microsoft.AppInstaller -e --accept-source-agreements
   ```
2. Copy this folder (or clone the repo) to the new machine.
3. Preview what will be installed:
   ```powershell
   .\scripts\windows\install-apps.ps1 -List
   ```
   If script execution is blocked, wrap the call:
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -Command "& '.\scripts\windows\install-apps.ps1' -List"
   ```
4. Install. Run it from an **elevated** PowerShell so machine-wide installers
   (Visual Studio Build Tools, TeamViewer, OpenVPN, ...) don't trip over UAC:
   ```powershell
   .\scripts\windows\install-apps.ps1
   ```
   The script calls `winget import --ignore-unavailable --no-upgrade`, so it is
   safe to rerun and skips packages that are already installed.
5. Sign out and back in so PATH changes (Git, Python, Neovide, ...) take effect.

## What is not covered

`winget export` only records apps that have a package source. These are not in
`winget-packages.json` but are visible in `installed-apps.txt`:

- Inbox Windows apps (Calculator, Notepad, Camera, Game Bar, Phone Link, ...) —
  Windows installs them itself.
- Store/MSIX apps without a winget source (ChatGPT, Google Gemini, LeetCode,
  DesignGuru, ...).
- Apps installed from plain installers / portable copies (ARP entries).

WSL distributions and NixOS configuration are not restored by winget either;
`Microsoft.WSL` only restores the WSL runtime.

## Journals quick capture (optional)

The AutoHotkey script lives in [`../journals-capture.ahk`](../journals-capture.ahk).
After `AutoHotkey.AutoHotkey` is installed, put it in the Startup folder so it runs
at login:

```powershell
Copy-Item .\scripts\journals-capture.ahk "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\"
```

## Refreshing the backup

After installing or removing apps, regenerate the snapshot and commit it:

```powershell
.\scripts\windows\export-apps.ps1
git add scripts/windows
git commit -m "chore(windows): refresh app backup"
```

Versions are intentionally dropped from the install manifest: a new machine gets
the latest version of each app. Use `winget-packages.versions.json` when you need
to know what was installed on this machine at export time.
