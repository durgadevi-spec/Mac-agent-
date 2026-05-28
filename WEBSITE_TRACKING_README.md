# Chrome Website Tracking - Complete Guide

## 📋 Overview

The Knockturn Employee Agent now tracks which websites employees visit in Chrome, Microsoft Edge, and Firefox. This information appears in the Admin Monitoring Dashboard to show not just that Chrome is open, but which specific website they're viewing.

### What It Captures
- **Browser**: Chrome, Edge, Firefox, Brave, Safari
- **Website**: Domain name extracted from URL (e.g., `github.com`, `mail.google.com`)
- **Page Title**: Full browser tab title
- **Timestamp**: When the activity occurred
- **Duration**: How long spent on that site

### Display Format
```
Chrome • github.com (GitHub - Main Page)
Edge • mail.google.com (Gmail Inbox)
Firefox • stackoverflow.com (Stack Overflow - Questions)
```

---

## 🎯 How It Works

### Architecture
```
Chrome Tab Update
        ↓
Chrome Extension (background.js)
        ↓ (sends URL & title)
http://localhost:5014/browser-event
        ↓
Electron Local Server (localServer.ts)
        ↓
Activity Monitor (parseWebsite function)
        ↓ (extracts domain name)
Activity Log with website field
        ↓
Activity Sync Service (every 30 seconds)
        ↓
Supabase activity_logs table (website column)
        ↓
Admin Monitoring Dashboard
        ↓
"Chrome • domain.com (Page Title)"
```

### Components

#### 1. Chrome Extension (`chrome-extension/background.js`)
- Listens for tab changes and URL updates
- Sends URL and title to local server
- Deduplicates identical updates
- Handles window focus events

#### 2. Local Server (`electron/localServer.ts`)
- Receives POST requests on `/browser-event` endpoint
- Forwards URL/title to Activity Monitor
- Logs all browser events for debugging

#### 3. Activity Monitor (`electron/activityMonitor.ts`)
- **parseWebsite()** function extracts domain from URL
- Handles edge cases (subdomains, multi-part TLDs, malformed URLs)
- Falls back to window title parsing if URL unavailable
- Stores website in `lastBrowserUrl` state

#### 4. Activity Sync Service (`src/lib/activitySyncService.ts`)
- Syncs activity logs to Supabase every 30 seconds
- Includes website field in each log entry
- Logs browser activities with 🌐 emoji for debugging

#### 5. Monitoring Dashboard (`src/components/MonitoringDashboard.tsx`)
- Displays website info for browser activities
- Shows format: `Chrome • domain.com (Page Title)`
- Falls back gracefully if website data unavailable

---

## ✅ Verification Checklist

### Quick Verification
- [ ] Open Admin Monitoring Screen
- [ ] Select an employee
- [ ] Go to "Activity" tab
- [ ] Do you see `Chrome • github.com` format? ✅ Working
- [ ] Or do you see `Chrome • No title`? ❌ Not working

### Detailed Verification

#### Step 1: Chrome Extension
```
1. Open chrome://extensions/
2. Look for "Knockturn Monitor" extension
3. Should show "Enabled"
4. Click "Details" → verify permissions
```

#### Step 2: Extension Connection
```
1. Open Chrome DevTools (F12)
2. Go to Console tab
3. Look for: "[Knockturn Monitor] ✓ Browser event sent:"
4. If missing: Extension not communicating
```

#### Step 3: Local Server
```
1. Check Electron app console for:
   "[LocalServer] 🌐 Browser event received:"
2. If missing: Server not receiving events
```

#### Step 4: Activity Monitor
```
1. Check Electron console for:
   "[Monitor] 🌐 New Chrome activity: domain.com"
2. If missing: Website extraction failing
```

#### Step 5: Supabase Database
```
1. Go to Supabase SQL Editor
2. Run:
   SELECT app_name, website, window_title, logged_at 
   FROM activity_logs 
   WHERE app_name ILIKE '%chrome%' 
   ORDER BY logged_at DESC LIMIT 10;
3. Check "website" column has domain names
```

#### Step 6: Dashboard Display
```
1. Admin Monitoring Screen → Select Employee
2. Activity tab should show websites for Chrome/Edge/Firefox
3. Check if formatting is correct
```

---

## 🔍 Debugging Steps

### Issue: "Chrome • No title" appears

**Check this in order:**

1. **Is Chrome extension installed?**
   - Go to `chrome://extensions/`
   - Search for "Knockturn Monitor"
   - If missing: Reinstall from `chrome-extension/` folder

2. **Is extension sending URLs?**
   - Open DevTools (F12)
   - Console tab
   - Navigate to different websites
   - Should see `[Knockturn Monitor] ✓ Browser event sent:` messages
   - If not: Enable extension or check manifest.json permissions

3. **Is local server receiving events?**
   - Check Electron app console
   - Should show `[LocalServer] 🌐 Browser event received:`
   - If not: Port 5014 may be blocked
   - Test: `curl http://localhost:5014/browser-event`

4. **Is website being extracted?**
   - Check Electron console for `[Monitor] 🌐 New Chrome activity:`
   - If missing: URL parsing may be failing
   - Check the parseWebsite function

5. **Is data reaching database?**
   - Supabase → SQL Editor
   - Query activity_logs table
   - Check website column (not empty?)
   - If empty: Data not being saved properly

6. **Is dashboard fetching correctly?**
   - DevTools → Network tab
   - Look for activity_logs query
   - Check response includes website data
   - If not: Dashboard may need refresh

### Issue: Extension disabled or not working

**Solution:**
1. Navigate to `chrome://extensions/`
2. Find "Knockturn Monitor"
3. Toggle "Enabled" off, wait 2 seconds
4. Toggle "Enabled" on
5. Reload the page you're monitoring

### Issue: Website showing but incorrect domain

**Solution:**
- The parseWebsite function may need tuning
- Common issues:
  - Subdomains shown (api.github.com instead of github.com)
  - Multi-part TLDs not handled (.co.uk, .com.au)
  - File:// URLs not parsed correctly

**Fix:**
- Edit `electron/activityMonitor.ts`
- Update `parseWebsite()` function
- Rebuild and restart

---

## 📊 Database Schema

### activity_logs Table
```sql
CREATE TABLE activity_logs (
  id uuid PRIMARY KEY,
  session_id uuid,
  employee_id uuid,
  app_name text,           -- "Chrome", "Edge", "Firefox", etc.
  window_title text,       -- Full page title
  activity_type text,      -- "app", "idle", "away"
  website text,            -- Domain: "github.com", "gmail.com", etc.
  logged_at timestamptz,
  duration_seconds int,
  productive boolean,
  cpu_usage float,
  memory_usage float
);
```

**Example Row:**
```
app_name: "Chrome"
window_title: "GitHub - Notifications"
website: "github.com"
logged_at: 2026-05-28 14:35:22
duration_seconds: 300
productive: true
```

---

## 🚀 Performance Considerations

- **URL Deduplication**: Same URL + title not sent repeatedly (reduces noise)
- **Periodic Sync**: Browser state re-sent every 30 seconds as fallback
- **Local Storage**: Up to 200 activity logs stored in memory
- **Database**: Only new logs synced (timestamp-based filtering)
- **Dashboard**: Activity logs fetched on demand (cached locally)

---

## 📝 Common Website Display Formats

| Browser | Format | Example |
|---------|--------|---------|
| Chrome | `Chrome • domain` | `Chrome • github.com` |
| Edge | `Edge • domain` | `Microsoft Edge • gmail.com` |
| Firefox | `Firefox • domain` | `Firefox • stackoverflow.com` |
| With title | `App • domain (title)` | `Chrome • github.com (GitHub - Issues)` |
| No website | `App • title` | `Chrome • Untitled Page` |

---

## 🛠️ Manual Testing

### Test Browser Event Endpoint

**Windows PowerShell:**
```powershell
$body = @{
    url = "https://github.com/user/repo"
    title = "GitHub Repository"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5014/browser-event" `
    -Method POST `
    -Headers @{'Content-Type'='application/json'} `
    -Body $body
```

**Expected Response:**
```json
{"success": true}
```

### Test parseWebsite Function

**Create test file**: `test-parsewebsite.js`
```javascript
function parseWebsite(url, title) {
  // [See implementation in activityMonitor.ts]
}

const tests = [
  { url: 'https://github.com/user', expected: 'github.com' },
  { url: 'https://api.github.com', expected: 'github.com' },
  { url: 'https://www.google.com', expected: 'google.com' },
  { title: 'Gmail - Google', expected: 'gmail.com' or null },
];

tests.forEach(test => {
  const result = parseWebsite(test.url, test.title);
  console.log(`${test.url} → ${result} (expected: ${test.expected})`);
});
```

---

## 📞 Support

### Enable Verbose Logging
1. Edit `electron/activityMonitor.ts`
2. Change `console.debug()` to `console.log()`
3. Restart agent
4. Check console for detailed logs

### Collect Debug Information
When reporting issues, provide:
1. Chrome extension version
2. Knockturn Agent version
3. Screenshots from Admin Dashboard
4. Console logs (Chrome DevTools + Electron console)
5. Supabase query results from activity_logs table

### Required Files for Debugging
- `chrome-extension/background.js` - Extension script
- `electron/activityMonitor.ts` - Website parsing
- `electron/localServer.ts` - Server handling
- `src/components/MonitoringDashboard.tsx` - Display logic
- Browser Console (DevTools)
- Electron App Console output

---

## ✨ Recent Improvements (May 28, 2026)

### Website Parsing Enhancement
- Better URL parsing with edge case handling
- Support for multi-part TLDs (.co.uk, .com.au, etc.)
- Improved subdomain handling
- Better fallback to window title

### Chrome Extension Updates
- Enhanced logging for debugging
- Added window focus detection
- Improved deduplication logic
- Added timestamp to browser events

### Dashboard Improvements
- Better empty website field handling
- Prominent website display for browsers
- Non-redundant title information
- Clearer formatting

### Debugging Features
- Comprehensive logging throughout pipeline
- 🌐 emoji for easy visual identification of browser activities
- Detailed console messages at each step
- Database query examples for verification

---

## 🎯 Future Enhancements

Potential improvements for future versions:
- [ ] Website category classification (social, email, dev, etc.)
- [ ] Deep link capture (track specific pages within sites)
- [ ] Browsing history timeline view
- [ ] Website productivity scoring
- [ ] Tab title history (see what they're currently working on)
- [ ] Screenshot integration with website info
- [ ] Website alerts and policies (block certain sites, etc.)
