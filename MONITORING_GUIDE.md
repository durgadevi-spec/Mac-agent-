# Knockturn Employee Agent - Monitoring System

## Overview

The updated system includes a **Super Admin Monitoring Dashboard** that tracks employee productivity in real-time with comprehensive activity logging, screenshots, and performance metrics.

## Features

### ✅ Real-Time Monitoring
- Live employee activity tracking
- Active application detection
- Idle time detection (5-minute threshold)
- Productivity percentage calculation
- Session duration tracking

### ✅ Comprehensive Dashboard
- Employee overview with status indicators
- Department performance metrics
- Weekly productivity trends
- Employee status distribution pie chart
- Quick employee activity table

### ✅ Individual Employee Monitoring
- Current app being used
- Time breakdown (active, productive, non-productive, idle, away)
- Real-time activity logs
- Screenshot history
- Idle alerts
- Call logs

### ✅ Activity Collection
- Automatic app switching detection
- Idle/active state transitions
- Productivity scoring based on app type
- Local caching of activity data
- Supabase cloud sync

## User Roles

### 1. **Super Admin** (Full Access)
- Email: `ADMIN`
- Name: `admin`
- Password: `admin@123`
- Access: Complete monitoring dashboard with all employee data

### 2. **Employee** (Normal User)
- Email: `E0001`
- Name: `SAM`
- Password: `admin123`
- Access: Daily plan submission, time tracking, water reminders

## Login Flow

```
├── Admin Login (ADMIN / admin / admin@123)
│   └── → Super Admin Monitoring Dashboard
│
└── Employee Login (E0001 / SAM / admin123)
    ├── → Daily Plan Screen
    ├── → Motivation Screen
    └── → Timer/Tracking Screen
```

## System Architecture

### Components

#### 1. **AdminMonitoringScreen.tsx**
- Main admin dashboard
- KPI cards (total employees, active, productivity, departments)
- Charts (productivity trends, status distribution)
- Department performance table
- Quick employee overview
- Detailed view switcher

#### 2. **MonitoringDashboard.tsx**
- Detailed employee monitoring
- Employee list with status
- Individual activity details
- Time metrics breakdown
- Activity logs with real-time updates
- Screenshot gallery
- Idle alerts
- Call logs tabs

#### 3. **activityCollector.ts**
Collects activity data:
- Active window detection
- Idle time calculation
- App switching tracking
- Activity logging
- Screenshot capture capability

#### 4. **activitySyncService.ts**
Syncs data to Supabase:
- Time metrics aggregation
- Productivity score calculation
- Supabase integration
- Local caching
- Batch data sending every 30 seconds

## Data Collection

### What Gets Tracked

#### Active Time
- Total time employee is logged in
- Updated every 30 seconds

#### Productive Time
- Time spent in productive apps:
  - VS Code
  - Excel/Word
  - Slack/Teams
  - Gmail
  - Chrome
  - Firefox

#### Non-Productive Time
- Time in other applications

#### Idle Time
- Detected after 5 minutes of inactivity
- No mouse/keyboard events

#### Productivity Score
- 80-100% for productive apps
- 20-60% for other apps
- Real-time calculation

### Activity Logs
Each activity includes:
- Timestamp
- Event type (app_switch, idle_start, idle_end)
- Detailed description

## Real-Time Sync

### Sync Interval: 30 seconds
- Activity data uploaded to Supabase
- Local cache maintained
- Offline-compatible
- Auto-sync on reconnection

### Data Stored in Supabase
Table: `employee_activity`
- employee_id
- timestamp
- active_time
- productive_time
- nonproductive_time
- idle_time
- away_time
- productivity_score
- current_app
- activity_logs (JSON)
- online_status

## Admin Dashboard Features

### Overview Tab
1. **KPI Cards**
   - Total Employees
   - Currently Active
   - Average Productivity
   - Number of Departments

2. **Weekly Productivity Trend Chart**
   - Productivity percentage by day
   - Number of active employees by day

3. **Employee Status Pie Chart**
   - Online (green)
   - Idle (yellow)
   - Away (orange)
   - Offline (gray)

4. **Department Performance Table**
   - Department name
   - Total staff
   - Active now
   - Average productivity %

5. **Quick Employee Overview Table**
   - Employee name
   - Department
   - Current status
   - Current app
   - Productivity %
   - Session duration

### Detailed Tab
Access individual employee monitoring with:
- Detailed time breakdown
- Current session info
- Activity logs (real-time updates)
- Screenshot gallery
- Idle alerts
- Call logs

## Installation & Setup

### Prerequisites
- Windows 10/11
- 50-80 MB RAM
- Internet connection (optional with offline mode)

### Install Steps
1. Download `Knockturn Employee Agent Setup 1.0.0.exe`
2. Run installer
3. Auto-starts on completion
4. Registers for Windows auto-start

### Launch
1. Double-click desktop shortcut
2. Or open from Start Menu
3. App loads in fullscreen login mode

## Login Instructions

### For Admins
```
Code: ADMIN
Name: admin
Password: admin@123
```
→ Super Admin Monitoring Dashboard

### For Employees
```
Code: E0001
Name: SAM
Password: admin123
```
→ Employee Tracking Dashboard

## Monitoring Workflow

### As Admin:
1. ✅ Login with admin credentials
2. ✅ View overview dashboard with all KPIs
3. ✅ Check department performance
4. ✅ Click "View Detailed Dashboard" for granular view
5. ✅ Select employee from list
6. ✅ Monitor real-time activity
7. ✅ Export reports as needed

### As Employee:
1. ✅ Login with employee credentials
2. ✅ Submit daily plan
3. ✅ View motivation screen
4. ✅ Start work timer
5. ✅ Get hourly water reminders
6. ✅ Activity tracked automatically every 30 seconds
7. ✅ Data synced to monitoring dashboard

## Performance Metrics

| Metric | Value |
|--------|-------|
| Memory Usage | ~60-100 MB |
| CPU Usage (Idle) | <2% |
| Startup Time | <2 seconds |
| Sync Interval | 30 seconds |
| Cache Size | <150 MB |
| Data Points/Day | ~2,880 (30-second intervals) |

## Offline Mode

### How It Works
- Activity data cached locally when offline
- Auto-syncs when connection restored
- No data loss
- Seamless reconnection

### Cache Location
```
%APPDATA%\Knockturn Employee Agent\cache
```

### Cache Cleanup
- Session cache: 24 hours
- Plan cache: 7 days
- Activity logs: 30 days
- Screenshots: Manual cleanup

## Security

### Data Protection
- Encrypted credential storage
- HTTPS-only communication
- Sandboxed Electron process
- No admin privileges required
- Local cache encryption

### Access Control
- Role-based access (Admin vs Employee)
- Separate dashboards per role
- Session timeout: 8 hours
- Automatic logout on app close

## Troubleshooting

### Admin Dashboard Not Loading
1. Check internet connection
2. Verify Supabase connectivity
3. Clear browser cache
4. Restart application

### Activity Not Syncing
1. Check "Currently Active" count
2. Verify employee is logged in
3. Wait 30 seconds for sync cycle
4. Check offline mode status

### High CPU Usage
1. Restart application
2. Close unnecessary apps
3. Check for activity log overflow
4. Clear cache: Delete `%APPDATA%\Knockturn Employee Agent\cache`

### Screenshots Not Capturing
1. Grant camera/screen capture permissions
2. Restart application
3. Check Windows privacy settings

## File Locations

### Installation
```
C:\Program Files\Knockturn\knockturn-agent.exe
```

### Data Cache
```
%APPDATA%\Knockturn Employee Agent\cache
```

### Logs
```
%APPDATA%\Knockturn Employee Agent\logs
```

### Auto-Start Registry
```
HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run
```

## Support & Contact

- **Email**: support@knockturn.com
- **Documentation**: https://docs.knockturn.com
- **Support Team**: agent-support@company.com

## Version Info

- **Version**: 1.0.0
- **Build Date**: May 22, 2026
- **Platform**: Windows 10/11 (x64)
- **Technology**: Electron + React + Supabase

## Updates & Changelog

### v1.0.0 (Current)
- ✅ Super Admin Monitoring Dashboard
- ✅ Real-time employee activity tracking
- ✅ Department performance metrics
- ✅ Weekly productivity trends
- ✅ Individual employee detailed view
- ✅ Activity logging system
- ✅ Offline mode with sync
- ✅ Auto-start on Windows boot
- ✅ System tray integration

## Next Planned Features

- 📋 Report generation (PDF/Excel)
- 📊 Advanced analytics
- 🔔 Custom alert rules
- 📹 Screen recording
- 🎯 Target setting & tracking
- 👥 Team collaboration features
- 🌐 Web dashboard access
- 📱 Mobile app monitoring
