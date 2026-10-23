@echo off
echo Setting up Journals Quick Capture shortcut with hotkey Alt+Shift+E...
powershell.exe -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $p = Join-Path ([System.Environment]::GetFolderPath('Programs')) 'Journals Quick Capture.lnk'; $s = $ws.CreateShortcut($p); $s.TargetPath = 'powershell.exe'; $s.Arguments = '-WindowStyle Hidden -ExecutionPolicy Bypass -File ""\\wsl.localhost\NixOS\home\nixos\Repos\journals\scripts\quick-capture.ps1""'; $s.Hotkey = 'Alt+Shift+E'; $s.WindowStyle = 7; $s.Description = 'Journals Quick Capture'; $s.Save(); Write-Host 'Done! Hotkey registered: Alt+Shift+E'"
pause
