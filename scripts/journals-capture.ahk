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

SERVER_URL := "http://127.0.0.1:4321/capture"

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
        ; Use synchronous WinHttp.WinHttpRequest.5.1 for full status & response text
        http := ComObject("WinHttp.WinHttpRequest.5.1")
        http.Open("POST", SERVER_URL, false)
        http.SetRequestHeader("Content-Type", "application/json; charset=utf-8")
        http.SetTimeouts(2000, 2000, 3000, 3000)
        http.Send(body)

        status := http.Status
        response := http.ResponseText

        if (status == 200) {
            ; Show a non-blocking toast/tooltip confirmation for 1.5 seconds
            ToolTip("✓ Captured: " . rawText)
            SetTimer(() => ToolTip(), -1500)
        } else {
            MsgBox("Server returned error status " . status . ":`n" . response, "Capture Error", "Icon!")
        }
    } catch as err {
        MsgBox("Failed to connect to Journals server at " . SERVER_URL . "`n`nError: " . err.Message, "Journals Offline", "Icon!")
    }
}
