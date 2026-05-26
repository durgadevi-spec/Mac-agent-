# Knockturn Employee Agent - Desktop Setup Guide

## Overview
This is a full desktop agent application with:
- ✅ Auto-start on Windows boot
- ✅ Always-running background service
- ✅ Minimize to system tray
- ✅ Auto-reconnect on internet loss
- ✅ Offline cache support
- ✅ Fast startup
- ✅ Lightweight monitoring

## Installation

### Option 1: Download & Install (Recommended)
1. Download the latest `.msi` or `.exe` installer
2. Run the installer
3. Follow the setup wizard
4. App will auto-launch and register for auto-start

### Option 2: Build from Source

#### Prerequisites
- Node.js 16+ and npm
- Windows 7 or later

#### Build Steps

```bash
# 1. Install dependencies
npm install

# 2. Build React + Electron app
npm run build:windows

# 3. The installer will be created in dist/
# Output: Knockturn-Employee-Agent-Setup.exe
```

## Features

### ✅ Auto-Start
- Automatically launches when Windows starts
- Runs in background with minimal CPU usage
- Registry entry: `HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run`

### ✅ Background Monitoring
- Tracks:
  - Active/idle time
  - Application usage
  - Window titles
  - Productivity metrics
- Minimal resource usage (~50MB memory)

### ✅ Offline Mode
- Works without internet connection
- Caches:
  - Login credentials (encrypted)
  - Daily plan
  - Activity logs
  - Session data
- Auto-syncs when connection restored

### ✅ Auto-Reconnect
- Detects internet disconnection
- Retries every 5 seconds
- Automatic page reload on reconnection
- Offline notification in UI

### ✅ System Tray Integration
- Double-click tray icon to show/hide
- Right-click for quick actions
- Status indicators
- Quick exit option

## Usage

### First Launch
1. App opens in fullscreen login mode
2. Login with: **E0001 / SAM / admin123** (temp credentials)
3. Follow the daily plan workflow
4. Agent starts monitoring

### Daily Workflow
1. **Plan Submission** → Submit daily tasks
2. **Punch In** → Confirm attendance
3. **Work Tracking** → App monitors productivity
4. **Water Reminders** → Hourly hydration alerts
5. **Sign Out** → End session

### Minimize/Restore
- Click minimize button → Goes to system tray
- Double-click tray icon → Restore window
- Right-click tray icon → Context menu

## Configuration

### Cache Storage
- Location: `%APPDATA%\Knockturn Employee Agent\cache`
- Auto-cleaned after:
  - Session cache: 24 hours
  - Plan cache: 7 days

### Auto-Start Setup
After installation, auto-start is automatically enabled.

To manually enable/disable:
```powershell
# Enable auto-start (run as Administrator)
reg add "HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run" /v "Knockturn Employee Agent" /t REG_SZ /d "C:\Program Files\Knockturn\knockturn-agent.exe" /f

# Disable auto-start
reg delete "HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run" /v "Knockturn Employee Agent" /f
```

## Troubleshooting

### App not starting at Windows boot
1. Open Settings → Apps → Startup
2. Look for "Knockturn Employee Agent"
3. Toggle to "On"

### Offline mode not working
1. Check Settings → Privacy → App permissions
2. Verify internet connection (use `ping 8.8.8.8`)
3. Wait 30 seconds for auto-reconnect

### High CPU usage
1. Open Task Manager
2. Find "Knockturn Employee Agent"
3. Right-click → End task → Restart

### Cache issues
1. Navigate to: `%APPDATA%\Knockturn Employee Agent\cache`
2. Delete `index.json`
3. Restart app

## Performance Metrics

| Metric | Value |
|--------|-------|
| Memory Usage | ~50-80 MB |
| CPU Usage (Idle) | <1% |
| Startup Time | <2 seconds |
| Cache Size | <100 MB |
| Network Polling | Every 5 seconds (offline only) |

## Security

- Runs in sandboxed Electron context
- No admin privileges required
- Credentials stored in encrypted cache
- No external data collection
- HTTPS-only communication

## Support

For issues or questions:
- Contact: support@knockturn.com
- Documentation: https://docs.knockturn.com
- Email: agent-support@company.com

## Uninstall

1. Open Windows Settings → Apps → Apps & features
2. Find "Knockturn Employee Agent"
3. Click → Uninstall
4. Follow uninstall wizard

Auto-start registry entry will be automatically removed.
