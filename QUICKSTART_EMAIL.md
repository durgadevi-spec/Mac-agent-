# Daily Email Summary - Quick Start (5 minutes)

## The Short Version

You now have an automated daily email feature like TimeChamp! Here's how to enable it.

## Step 1: Set Environment Variables (2 minutes)

Add these to your system environment or `.env.local` file:

```bash
# Gmail Example (easiest to set up)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-16-digit-app-password
EMAIL_FROM=your-gmail@gmail.com
EMAIL_FROM_NAME=Knockturn Employee Agent
SUMMARY_EMAIL_TIME=0 6 * * *
```

**Note**: For Gmail, use an [App Password](https://myaccount.google.com/apppasswords), not your regular password.

## Step 2: Install & Build (2 minutes)

```bash
npm install
npm run build:windows
```

## Step 3: Run & Verify (1 minute)

Start the app. Check the console (F12) for these messages:
```
✓ [Email Service] Email service initialized successfully
✓ [Scheduler] Daily scheduler started successfully
```

**That's it!** Emails will now send daily at 6 AM UTC.

## Want to Test Immediately?

Open the developer console (F12) and run:
```javascript
window.electronAPI.invoke('trigger-daily-summary-emails')
  .then(r => console.log('Sent!', r))
```

Check the configured email address for a test report.

## Need Different Time?

Use [crontab.guru](https://crontab.guru) to find your time, then set:
```bash
SUMMARY_EMAIL_TIME=your-cron-expression
```

Examples:
- `0 9 * * *` = 9 AM UTC
- `0 18 * * *` = 6 PM UTC  
- `0 9 * * MON-FRI` = Weekdays 9 AM UTC

## Common Issues

| Problem | Fix |
|---------|-----|
| Emails not sending | Check console logs for errors |
| SMTP error | Verify username/password, use Gmail App Password |
| No activity data | Ensure employee was active yesterday |
| Wrong time | Convert timezone to UTC, check SUMMARY_EMAIL_TIME |

## Full Documentation

- **Setup Details**: See [EMAIL_SETUP.md](./EMAIL_SETUP.md)
- **Admin Guide**: See [ADMIN_EMAIL_GUIDE.md](./ADMIN_EMAIL_GUIDE.md)
- **Full Docs**: See [DAILY_EMAIL_FEATURE.md](./DAILY_EMAIL_FEATURE.md)

## What Gets Sent?

Each employee receives a beautiful email with:
- 📊 Total Time, Desk Time, Idle Time
- ✅ Productive Time, Non-Productive Time
- 📈 Productivity Score (%)
- 🖥️ Top 5 Apps Used

**Done!** 🎉
