#Requires AutoHotkey v2.0
; ==============================================================================
; Journals Quick Capture - Instant Native AutoHotkey GUI
; Sub-10ms instant startup, runs in background tray, zero cold-start delay.
;
; Hotkey: Alt + Shift + E
; Keys:
;   Enter            -> Submit note to Journals server (WSL)
;   Escape           -> Cancel / Hide
;   Ctrl + Backspace -> Delete preceding word
;   Ctrl + W         -> Delete preceding word
;   Ctrl + U         -> Clear line
; ==============================================================================

#SingleInstance Force
TraySetIcon "shell32.dll", 265  ; Notepad-like icon in system tray

SERVER_URL := "http://127.0.0.1:4322/capture"

; Build the GUI once and keep it resident in memory for instant show/hide
CaptureGui := Gui("+AlwaysOnTop -MaximizeBox -MinimizeBox", "Journals Quick Capture")
CaptureGui.BackColor := "F3F3F3"
CaptureGui.SetFont("s10", "Segoe UI")

TitleLabel := CaptureGui.Add("Text", "x16 y12 w500 c1F1F1F", "Quick Capture  (Enter: submit | Esc: cancel)")

CaptureGui.SetFont("s12", "Segoe UI")
CaptureInput := CaptureGui.Add("Edit", "x16 y38 w500 h34 -WantReturn BackgroundFFFFFF c1F1F1F")

; Hotkeys scoped only to this capture GUI
#HotIf WinActive("ahk_id " . CaptureGui.Hwnd)

Enter::
NumpadEnter:: {
    text := Trim(CaptureInput.Value)
    if (text == "") {
        CaptureGui.Hide()
        return
    }

    CaptureGui.Hide()
    SubmitNote(text)
}

Escape:: {
    CaptureGui.Hide()
}

; Ctrl + Backspace & Ctrl + W: Delete word backwards
^BackSpace::
^w:: {
    ControlFocus(CaptureInput)
    Send("^+{Left}{Delete}")
}

; Ctrl + U: Delete backwards to start of line
^u:: {
    ControlFocus(CaptureInput)
    Send("+{Home}{Delete}")
}

#HotIf

; Global Shortcut: Alt + Shift + E (!+e)
!+e:: {
    CaptureInput.Value := ""
    CaptureGui.Show("w532 h88 Center")
    ControlFocus(CaptureInput)
}

SubmitNote(rawText) {
    global SERVER_URL

    ; Escape JSON string
    escaped := StrReplace(rawText, "\", "\\")
    escaped := StrReplace(escaped, '"', '\"')
    escaped := StrReplace(escaped, "`n", "\n")
    escaped := StrReplace(escaped, "`r", "\r")
    escaped := StrReplace(escaped, "`t", "\t")
    body := '{"raw":"' . escaped . '"}'

    try {
        http := ComObject("MSXML2.ServerXMLHTTP.6.0")
        http.Open("POST", SERVER_URL, true) ; asynchronous
        http.SetRequestHeader("Content-Type", "application/json; charset=utf-8")
        http.setTimeouts(1000, 1000, 2000, 2000)
        http.Send(body)
    } catch as err {
        MsgBox("Could not connect to Journals server at " . SERVER_URL . "`nMake sure the server is running in WSL.`n`nError: " . err.Message, "Journals Server Offline", "Icon!")
    }
}
