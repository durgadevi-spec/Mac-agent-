# Daily Summary Email Feature - Summary

## What Was Implemented

The Knockturn Employee Agent now includes a **daily automated email summary feature** that sends productivity reports to employees every day, similar to TimeChamp.

## Key Capabilities

### 📧 Email Features
- **Automated Daily Delivery**: Scheduled emails sent automatically each day
- **Professional Template**: Clean, branded HTML emails with color-coded metrics
- **Personalized Content**: Employee names and customized data per recipient
- **Productivity Scoring**: Percentage-based productivity calculation

### 📊 Metrics Included in Emails
- **Total Time**: Overall session duration
- **Desk Time**: Active work time
- **Idle Time**: Inactivity duration
- **Productive Time**: Focus/work activities
- **Non-Productive Time**: Distracting activities
- **Top Applications**: 5 most-used apps/websites with time spent

### ⚙️ Configuration Options
- **SMTP Support**: Works with Gmail, Outlook, SendGrid, or custom SMTP servers
- **Flexible Scheduling**: Use cron format to schedule daily, weekly, or custom times
- **Environment Variables**: Secure configuration via environment variables
- **Manual Trigger**: Ability to send emails immediately for testing

### 🔧 Technical Components

**New Files**:
1. `electron/emailService.ts` - Email transmission and HTML template
2. `electron/dailyScheduler.ts` - Cron scheduler and data aggregation
3. `EMAIL_SETUP.md` - Provider-specific configuration guide
4. `DAILY_EMAIL_FEATURE.md` - Comprehensive feature documentation
5. `ADMIN_EMAIL_GUIDE.md` - Administrator quick reference

**Modified Files**:
1. `package.json` - Added nodemailer and node-cron dependencies
2. `electron/main.ts` - Scheduler initialization and cleanup

## How to Enable

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Email
Set environment variables:
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com
EMAIL_FROM_NAME=Knockturn Employee Agent
SUMMARY_EMAIL_TIME=0 6 * * *
```

### Step 3: Build & Run
```bash
npm run build
npm run dev:electron
```

Check console logs for initialization messages:
```
[Email Service] Email service initialized successfully
[Scheduler] Daily scheduler started successfully
```

## Supported Email Providers

- ✅ **Gmail** (recommended for testing)
- ✅ **Outlook / Office 365**
- ✅ **SendGrid**
- ✅ **Custom SMTP servers**

See [EMAIL_SETUP.md](./EMAIL_SETUP.md) for provider-specific configuration.

## Usage Examples

### Default Configuration
Sends emails daily at 6:00 AM UTC:
```bash
SUMMARY_EMAIL_TIME=0 6 * * *
```

### Weekdays Only
Sends Monday-Friday at 9:00 AM UTC:
```bash
SUMMARY_EMAIL_TIME=0 9 * * MON-FRI
```

### Multiple Times Per Day
Schedule multiple jobs by creating multiple schedulers (future enhancement).

## Testing

### Manual Trigger
From developer console (F12):
```javascript
window.electronAPI.invoke('trigger-daily-summary-emails')
  .then(result => console.log('Success:', result));
```

### Immediate Send on Startup
Uncomment in `dailyScheduler.ts`:
```typescript
sendDailySummaryEmails(); // Line ~180
```

## Database Requirements

The feature requires:
- `employees` table with `email` column populated
- `employee_activity` table with daily activity records
- Activity logs with application usage data

## Monitoring & Logging

Console logs track:
- Email service initialization
- Scheduler startup/shutdown
- Daily job execution
- Success/failure count
- Error messages with details

Example logs:
```
[Scheduler] Starting daily summary email job
[Scheduler] Found 12 employees with email addresses
[Scheduler] Summary email sent to employee@example.com
[Scheduler] Daily summary email job completed. Sent: 12, Failed: 0
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Emails not sending | Check environment variables, SMTP credentials |
| SMTP auth failed | Verify credentials, use app password for Gmail |
| No activity data | Ensure monitoring is running, check database |
| Scheduler not running | Check console logs, verify environment setup |
| Emails in spam | Add sender to contacts, verify domain SPF/DKIM |

## Documentation

- **[EMAIL_SETUP.md](./EMAIL_SETUP.md)** - Email provider configuration
- **[DAILY_EMAIL_FEATURE.md](./DAILY_EMAIL_FEATURE.md)** - Full technical documentation
- **[ADMIN_EMAIL_GUIDE.md](./ADMIN_EMAIL_GUIDE.md)** - Administrator quick start

## Performance Impact

- **Negligible**: Email processing happens asynchronously
- **No blocking**: Doesn't affect application performance
- **Efficient**: Batch processing of employees
- **Cleanup**: Scheduler stops cleanly on app shutdown

## Future Enhancements

Potential improvements:
- Per-employee scheduling
- Manager/admin rollup reports
- Weekly/monthly summaries
- Slack/Teams integration
- Custom metrics and KPIs
- Report PDF export
- Multi-language support

## Security

- ✅ Credentials via environment variables (never hardcoded)
- ✅ SMTP password encryption (by Nodemailer)
- ✅ No sensitive data in email content
- ✅ Audit logging of all email actions
- ✅ Per-employee validation before sending

## Architecture Diagram

```
App Startup
    ↓
Initialize Email Service
    ↓
Start Daily Scheduler (Cron)
    ↓
[Waiting for scheduled time]
    ↓
At scheduled time:
  1. Fetch all employees with emails
  2. Get activity data from yesterday
  3. Calculate metrics
  4. Generate HTML email
  5. Send via SMTP
  6. Log results
```

## Version Information

- **Nodemailer**: ^6.9.7
- **Node-Cron**: ^3.0.3
- **Supabase**: ^2.57.4
- **Node.js**: 16+

## License

Same as parent project (Knockturn Employee Agent)

---

**For detailed setup and configuration, see [EMAIL_SETUP.md](./EMAIL_SETUP.md) and [ADMIN_EMAIL_GUIDE.md](./ADMIN_EMAIL_GUIDE.md)**
