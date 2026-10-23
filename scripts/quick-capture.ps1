# Requires PowerShell (Standard on Windows 10/11)
# Uses WPF for a modern, instant, centered popup dialog.

Add-Type -AssemblyName PresentationFramework
Add-Type -AssemblyName WindowsBase
Add-Type -AssemblyName PresentationCore

# Create the popup window
$window = New-Object System.Windows.Window
$window.Title = "Journals Quick Capture"
$window.Width = 560
$window.Height = 120
$window.WindowStartupLocation = "CenterScreen"
$window.Topmost = $true
$window.ResizeMode = "NoResize"
$window.WindowStyle = "SingleBorderWindow"
$window.Background = [System.Windows.Media.BrushConverter]::new().ConvertFromString("#181825")

# Stack layout
$stack = New-Object System.Windows.Controls.StackPanel
$stack.Margin = [System.Windows.Thickness]::new(14)

# Header label
$label = New-Object System.Windows.Controls.TextBlock
$label.Text = "⚡ Quick Capture  (Enter: submit | Esc: cancel)"
$label.Foreground = [System.Windows.Media.BrushConverter]::new().ConvertFromString("#cdd6f4")
$label.FontSize = 12
$label.Margin = [System.Windows.Thickness]::new(0, 0, 0, 8)
$stack.Children.Add($label)

# Text input box
$textBox = New-Object System.Windows.Controls.TextBox
$textBox.FontSize = 14
$textBox.Background = [System.Windows.Media.BrushConverter]::new().ConvertFromString("#313244")
$textBox.Foreground = [System.Windows.Media.BrushConverter]::new().ConvertFromString("#cdd6f4")
$textBox.CaretBrush = [System.Windows.Media.BrushConverter]::new().ConvertFromString("#cdd6f4")
$textBox.BorderBrush = [System.Windows.Media.BrushConverter]::new().ConvertFromString("#585b70")
$textBox.Padding = [System.Windows.Thickness]::new(8, 6, 8, 6)
$stack.Children.Add($textBox)

$window.Content = $stack

# Focus text box once window is loaded
$window.Add_Loaded({
    $textBox.Focus()
    $textBox.Select(0, 0)
})

# Keyboard shortcuts: Enter to submit, Escape to cancel
$window.Add_KeyDown({
    param($sender, $e)
    if ($e.Key -eq [System.Windows.Input.Key]::Enter) {
        $window.DialogResult = $true
        $window.Close()
    } elseif ($e.Key -eq [System.Windows.Input.Key]::Escape) {
        $window.DialogResult = $false
        $window.Close()
    }
})

# Display dialog
$result = $window.ShowDialog()

# If submitted with non-empty text, post to Journals server in WSL
if ($result -and -not [string]::IsNullOrWhiteSpace($textBox.Text)) {
    $note = $textBox.Text.Trim()
    $body = @{ raw = $note } | ConvertTo-Json -Compress

    try {
        # WSL2 exposes ports to Windows localhost automatically
        $response = Invoke-RestMethod -Uri "http://127.0.0.1:4321/capture" `
                                      -Method Post `
                                      -ContentType "application/json; charset=utf-8" `
                                      -Body $body `
                                      -TimeoutSec 3
    } catch {
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.MessageBox]::Show(
            "Could not connect to Journals server at http://127.0.0.1:4321.`nMake sure your server is running in WSL (e.g. 'bun run dev:server').`n`nError: $($_.Exception.Message)",
            "Journals Server Offline",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Warning
        ) | Out-Null
    }
}
