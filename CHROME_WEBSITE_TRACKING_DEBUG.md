# Chrome Website Tracking - Diagnostic Guide

## Overview
The Knockturn Employee Agent now captures detailed website information when employees browse in Chrome, Edge, or Firefox. This guide helps you verify the tracking is working correctly.

## 🔍 Diagnostic Steps

### Step 1: Check Chrome Extension Installation
1. Open Chrome
2. Navigate to `chrome://extensions/`
3. Look for "Knockturn Monitor" extension
4. Ensure it shows "Enabled" status
5. Click on "Details" to verify permissions include "activeTab" and "tabs"

**Issue**: Extension not installed or disabled
**Solution**: 
- Reinstall the extension from `chrome-extension/` folder
- Verify manifest.json includes proper permissions

---

### Step 2: Verify Local Server Connection
Open your browser's Developer Console and check for these log messages:

```javascript
// Open: Chrome → ⋮ → More tools → Developer tools → Console
```

**Look for**: 
- ✅ `[Knockturn Monitor] ✓ Browser event sent:`
- ❌ `[Knockturn Monitor] Failed to connect to local server`

**If you see connection errors**:
- Ensure the Knockturn Agent app is running
- Check if local server is listening on port 5014
- Verify firewall settings allow `127.0.0.1:5014`

---

### Step 3: Check Electron Main Process Logging
When the agent is running:

1. **Windows**: Open Task Manager → Find "Knockturn Agent" → Right-click → "Open process location"
2. Look in the application output for:

```
[LocalServer] 🌐 Browser event received: URL=github.com Title=...
[Monitor] 🌐 New Chrome activity: github.com
```

**If no browser events appear**:
- Chrome extension may not be communicating with the server
- Check port 5014 is accessible from Chrome extension

---

### Step 4: Verify Website Data in Database
Check the Supabase dashboard:

1. Go to your Supabase project → SQL Editor
2. Run this query:

```sql
SELECT 
  employee_id,
  app_name,
  window_title,
  website,
  logged_at
FROM activity_logs
WHERE app_name ILIKE '%chrome%' OR app_name ILIKE '%edge%' OR app_name ILIKE '%firefox%'
ORDER BY logged_at DESC
LIMIT 20;
```

**Expected Output**:
- `app_name`: "Chrome", "Microsoft Edge", or "Firefox"
- `website`: Domain name like "github.com", "gmail.com", etc.
- `window_title`: Full page title

**If website column is empty**:
- Website extraction may be failing
- Browser URL may not be reaching the activity monitor

---

### Step 5: Check Monitoring Dashboard Display
In the Admin Monitoring Screen:

1. Click on an employee
2. Go to "Activity" tab
3. Look for Chrome/Edge/Firefox activities
4. Should display as: `Chrome • github.com (Page Title)`

**If showing as**: `Chrome • No title`
- Website extraction is not working
- See Steps 1-4 above for diagnosis

---

## 🛠️ Debugging Checklist

### Chrome Extension Issues
- [ ] Extension is installed and enabled
- [ ] Manifest.json is valid (no errors in extension page)
- [ ] Background script is running (check background page)
- [ ] Console shows successful event sends

### Activity Monitor Issues  
- [ ] Electron app is running
- [ ] Local server started (check console for startup message)
- [ ] Browser events are being received (look for 🌐 logs)
- [ ] Website parsing is extracting domains correctly

### Database/Sync Issues
- [ ] Activity logs are being created in Supabase
- [ ] Website column has data (not empty strings)
- [ ] Sync service is running (30-second intervals)

### Dashboard Display Issues
- [ ] Monitoring dashboard is loading latest activity logs
- [ ] Website field is being displayed in activity details
- [ ] Filter/sorting isn't hiding website information

---

## 📊 Example Activity Log Flow

```
Chrome Extension
    ↓ (sends URL on tab change)
http://localhost:5014/browser-event
    ↓ (Local Server receives)
Activity Monitor (parseWebsite extracts domain)
    ↓ (stores in activity log with website field)
Activity Sync Service
    ↓ (sends to Supabase every 30s)
activity_logs table (website column)
    ↓ (fetched by monitoring dashboard)
Admin Monitoring Screen
    ↓ (displays as "Chrome • domain.com")
```

---

## 🔧 Manual Testing

### Test 1: Direct URL Send
Use this to manually test the `/browser-event` endpoint:

```bash
# On Windows (PowerShell)
$data = @{
    url = "https://github.com/knockturn"
    title = "GitHub Repository"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5014/browser-event" `
    -Method POST `
    -Headers @{'Content-Type'='application/json'} `
    -Body $data
```

**Expected**: Returns `{"success":true}` and you see it logged in Electron console

### Test 2: Check parseWebsite Function
The website extraction should handle:
- Full URLs: `https://www.github.com/user/repo` → `github.com`
- Browser titles: `GitHub - Main Page` → `github.com` (if Chrome sent the URL)
- Clean domains: `api.example.com` → `example.com`

---

## 📋 Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "Chrome • No title" in dashboard | Website not extracted | Check if Chrome extension is installed and sending URLs |
| Empty website field in DB | URL not reaching activity monitor | Verify localhost:5014 connection from Chrome |
| No Chrome activities logged | Window title not showing | Ensure Chrome window is in focus during activity |
| Website showing technical domains | URL parsing needs improvement | Check parseWebsite function logs |

---

## 🚀 Performance Notes

- **URL Deduplication**: Same URL/title combinations are not re-sent (reduces noise)
- **Periodic Sync**: Browser state is re-sent every 30 seconds as fallback
- **Local Storage**: Activity logs stored locally before sync (survives offline periods)
- **Data Retention**: Only most recent 200 activity logs kept in memory

---

## 📞 Next Steps

If website tracking is still not working after these checks:

1. **Enable Verbose Logging**:
   - Check browser console for detailed extension logs
   - Look at Electron app console for monitor logs

2. **Check Browser Permissions**:
   - Extension may lack required permissions
   - Re-install or grant additional permissions

3. **Verify Supabase Connection**:
   - Test other activity logs are syncing
   - Check Supabase connection status

4. **Reset Extension State**:
   - Disable and re-enable the extension
   - Clear extension storage data
   - Reload extension background script
