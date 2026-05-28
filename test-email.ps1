# Test Email Script
# Run this to trigger the daily summary email

$shell = New-Object -ComObject WScript.Shell
$file = "$PSScriptRoot\release\Knockturn Employee Agent 1.0.0.exe"

if (Test-Path $file) {
    Write-Host "Starting app to test email..."
    & $file
    Start-Sleep -Seconds 3
    
    # Sends the trigger command via developer tools
    Write-Host "Email trigger will be sent to the app..."
    Write-Host ""
    Write-Host "When the app opens:"
    Write-Host "1. Press F12 to open Developer Console"
    Write-Host "2. Type this and press Enter:"
    Write-Host "   window.electronAPI.triggerDailySummaryEmails()"
    Write-Host ""
    Write-Host "Check your email (durgadevi@ctint.in) in a few seconds!"
} else {
    Write-Host "Error: App not found at $file"
    Write-Host "Make sure you ran: npm run build:windows"
}
