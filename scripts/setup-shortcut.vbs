Set oWS = WScript.CreateObject("WScript.Shell")
sPrograms = oWS.SpecialFolders("Programs")
sLinkFile = sPrograms & "\Journals Quick Capture.lnk"

' Pythonw.exe runs windowless (no command prompt flicker)
sPythonw = oWS.ExpandEnvironmentStrings("%LOCALAPPDATA%\Programs\Python\Python311\pythonw.exe")

' Target script
sScript = "\\wsl.localhost\NixOS\home\nixos\Repos\journals\scripts\quick-capture.py"

Set oLink = oWS.CreateShortcut(sLinkFile)
oLink.TargetPath = sPythonw
oLink.Arguments = """" & sScript & """"
oLink.Hotkey = "Alt+Shift+E"
oLink.WindowStyle = 1
oLink.Description = "Journals Quick Capture"
oLink.Save

WScript.Echo "Success! Updated shortcut to Python at: " & sLinkFile & vbCrLf & "Hotkey registered: Alt+Shift+E"
