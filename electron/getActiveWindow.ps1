$definition = @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public class Win32 {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
}
"@

try {
    Add-Type -TypeDefinition $definition -ErrorAction SilentlyContinue
} catch {}

$hwnd = [Win32]::GetForegroundWindow()
if ($hwnd -and $hwnd -ne [IntPtr]::Zero) {
    $title = New-Object System.Text.StringBuilder 512
    [Win32]::GetWindowText($hwnd, $title, 512) | Out-Null
    
    $processId = [uint32]0
    [Win32]::GetWindowThreadProcessId($hwnd, [ref]$processId) | Out-Null
    
    if ($processId -gt 0) {
        $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Output "$($proc.ProcessName)|$($title.ToString())"
        }
    }
}
