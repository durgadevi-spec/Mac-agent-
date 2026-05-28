# Daily Email Summary - Administrator Guide

## Quick Start

### 1. Enable the Feature

Set these environment variables before starting the app:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com
EMAIL_FROM_NAME=Knockturn Employee Agent
SUMMARY_EMAIL_TIME=0 6 * * *
```

### 2. Verify Configuration

When the app starts, check the console logs:
- ✅ `[Email Service] Email service initialized successfully`
- ✅ `[Scheduler] Daily scheduler started successfully`

If these messages don't appear, email configuration was not found.

### 3. Test Manually

From the developer console (F12), run:

```javascript
window.electronAPI.invoke('trigger-daily-summary-emails').then(result => {
  console.log('Email trigger result:', result);
});
```

Check console for logs indicating success or failure.

## Configuration by Email Provider

### Gmail (Recommended for Testing)

1. Enable 2-Step Verification: https://myaccount.google.com/
2. Generate App Password:
   - Go to Account → Security → App passwords
   - Select Mail & Windows
   - Copy the generated 16-character password
3. Set environment variables:
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=xxxx-xxxx-xxxx-xxxx (16-char app password)
   ```

### Outlook/Office 365

```bash
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

### SendGrid

```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Schedule Configuration

The `SUMMARY_EMAIL_TIME` uses Cron format (5 fields):

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23, 0 = UTC midnight)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6, 0 = Sunday)
│ │ │ │ │
│ │ │ │ │
0 6 * * *
```

**Common Schedules**:

| Schedule | Time | Timezone |
|----------|------|----------|
| `0 6 * * *` | 6:00 AM | UTC |
| `0 18 * * *` | 6:00 PM | UTC |
| `0 9 * * MON-FRI` | 9:00 AM Weekdays | UTC |
| `30 8 * * *` | 8:30 AM | UTC |
| `0 1 * * *` | 1:00 AM | UTC |

**Timezone Conversion**:
- UTC 6:00 AM = US EST 1:00 AM = US PST 10:00 PM (previous day)
- To send at 9:00 AM EST: use `0 14 * * *` (UTC 14:00)
- To send at 9:00 AM PST: use `0 17 * * *` (UTC 17:00)

## Monitoring & Logs

### Check Scheduled Job Status

Console logs appear at three points:

**1. App Startup**:
```
[Email Service] Email service initialized successfully
[Scheduler] Starting daily scheduler with cron expression: 0 6 * * *
[Scheduler] Daily scheduler started successfully
```

**2. Scheduled Execution Time**:
```
[Scheduler] Starting daily summary email job
[Scheduler] Found 12 employees with email addresses
[Scheduler] Summary email sent to john@example.com
[Scheduler] Summary email sent to jane@example.com
...
[Scheduler] Daily summary email job completed. Sent: 12, Failed: 0
```

**3. Errors** (if they occur):
```
[Email Service] Failed to send email to john@example.com: [error details]
[Scheduler] Error fetching activities for [employee-id]: [error details]
```

### Enable Debug Logging

Uncomment this line in `dailyScheduler.ts` to send emails immediately on startup:

```typescript
// In sendDailySummaryEmails() function
sendDailySummaryEmails(); // Uncomment this
```

## Dashboard Integration (Future)

To add a button in the admin dashboard to trigger emails manually:

**In React Component**:
```typescript
const triggerEmails = async () => {
  const result = await window.electronAPI.invoke('trigger-daily-summary-emails');
  if (result) {
    console.log('Emails triggered successfully');
  } else {
    console.error('Failed to trigger emails');
  }
};

<button onClick={triggerEmails}>Send Daily Emails Now</button>
```

## Troubleshooting Checklist

### Emails Not Sending

- [ ] Email configuration variables are set
- [ ] SMTP credentials are correct
- [ ] Employees have valid email addresses in database
- [ ] There is activity data from yesterday
- [ ] Network connectivity is available
- [ ] No firewall blocking SMTP port (587 or 465)

### SMTP Connection Failed

- [ ] Hostname is correct for email provider
- [ ] Port number matches provider (usually 587)
- [ ] Credentials are correct
- [ ] App password enabled (for Gmail)
- [ ] Account not locked/suspended
- [ ] IP not blacklisted by provider

### Email Shows Wrong Data

- [ ] Activity data is being collected properly
- [ ] Database queries are returning correct records
- [ ] Employee names are in database
- [ ] Timestamps are correct

### Scheduler Not Running

- [ ] App is running (check tray)
- [ ] No errors on startup
- [ ] System time is correct
- [ ] Cron expression is valid
- [ ] Network is available at scheduled time

## Disabling the Feature

To disable email reports without removing code:

**Option 1**: Remove environment variables
- Delete or unset the email configuration variables
- Scheduler will warn in logs but continue running

**Option 2**: Comment out in main.ts
```typescript
// In app.on('ready'):
// startDailyScheduler(); // Disabled
```

**Option 3**: Stop scheduler programmatically
```typescript
window.electronAPI.invoke('trigger-daily-summary-emails'); // Existing handler
// Add new handler for stopDailyScheduler if needed
```

## Database Verification

Ensure employee data is properly configured:

```sql
-- Check employees with email addresses
SELECT id, employee_code, email, first_name, last_name 
FROM employees 
WHERE email IS NOT NULL;

-- Check recent activity data
SELECT employee_id, timestamp, active_time, productive_time 
FROM employee_activity 
WHERE timestamp > NOW() - INTERVAL '2 days'
LIMIT 10;

-- Check activity logs
SELECT employee_id, app_name, duration_seconds 
FROM activity_logs 
WHERE logged_at > NOW() - INTERVAL '1 day'
LIMIT 20;
```

## Support Resources

- **Email Setup Guide**: See [EMAIL_SETUP.md](./EMAIL_SETUP.md)
- **Full Feature Documentation**: See [DAILY_EMAIL_FEATURE.md](./DAILY_EMAIL_FEATURE.md)
- **Cron Reference**: https://crontab.guru/
- **Nodemailer Docs**: https://nodemailer.com/
- **Node-Cron Docs**: https://www.npmjs.com/package/node-cron
