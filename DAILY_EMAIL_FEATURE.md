# Daily Summary Email Feature - Implementation Guide

## Overview

The Knockturn Employee Agent now includes an automated daily summary email feature similar to TimeChamp. Each day, employees receive an email report containing:

- **Productivity Metrics**: Total time, desk time, idle time, productive time, non-productive time
- **Productivity Score**: Percentage-based productivity metric
- **Top Applications**: Most used applications and websites during the day
- **Visual Reports**: Professional HTML email template with color-coded metrics

## Architecture

### Components

1. **emailService.ts** - Email transmission engine
   - SMTP configuration
   - HTML email template generation
   - Email sending functionality
   - Test email capability

2. **dailyScheduler.ts** - Scheduled task manager
   - Cron-based scheduling (Node Cron)
   - Activity metrics aggregation
   - Employee data fetching from Supabase
   - Automated email distribution

3. **Integration** - Main.ts modifications
   - Scheduler initialization on app startup
   - Scheduler cleanup on app shutdown
   - IPC handlers for manual triggers

## Setup Instructions

### 1. Install Dependencies

The required packages are already added to package.json:
```bash
npm install
```

This includes:
- `nodemailer` - Email sending
- `node-cron` - Scheduled tasks
- `@supabase/supabase-js` - Database access

### 2. Configure Email Settings

Create a `.env.local` file in the project root or set system environment variables:

```bash
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Email Sender Information
EMAIL_FROM=your-email@gmail.com
EMAIL_FROM_NAME=Knockturn Employee Agent

# Scheduler Timing (Cron format)
# Default: 0 6 * * * (Daily at 6:00 AM UTC)
SUMMARY_EMAIL_TIME=0 6 * * *
```

See [EMAIL_SETUP.md](./EMAIL_SETUP.md) for detailed provider-specific instructions.

### 3. Ensure Employee Data

The feature requires:
- Employees table with `email` field populated
- Activity data collected from the previous day
- Valid email addresses for each employee

## How It Works

### Daily Workflow

1. **App Startup**: When the Knockturn Employee Agent starts, it initializes the daily scheduler
2. **Scheduled Time**: At the configured time (default 6 AM UTC), the scheduler triggers
3. **Data Collection**: 
   - Fetches all employees with valid email addresses
   - Queries activity data from yesterday
   - Calculates productivity metrics
   - Identifies top applications
4. **Email Generation**: Creates HTML email with:
   - Employee name personalization
   - Formatted metric values
   - Color-coded performance indicators
   - Top 5 most-used applications
5. **Distribution**: Sends email to each employee's registered address
6. **Logging**: Records success/failure status in console logs

### Metrics Calculation

The system aggregates data from the `employee_activity` table:

```
Total Time = active_time + idle_time + away_time
Desk Time = active_time
Productivity Score = (productive_time / total_time) × 100%
Non-Productive Time = nonproductive_time
Idle Time = idle_time
```

### Application Usage

The scheduler analyzes `activity_logs` within each activity record:

```
Top Apps = Most frequently used applications
Duration = Total time spent in each app
Sorted by duration descending
Limited to top 5 apps
```

## Customization

### Change Email Schedule

Modify the `SUMMARY_EMAIL_TIME` environment variable using Cron format:

```bash
# Examples:
"0 6 * * *"      # Daily at 6:00 AM UTC
"0 9 * * MON-FRI" # Weekdays at 9:00 AM UTC
"0 18 * * *"     # Daily at 6:00 PM UTC
"0 6 * * 1"      # Every Monday at 6:00 AM UTC
```

[Cron Format Reference](https://crontab.guru/)

### Customize Email Template

Edit the `generateSummaryEmailTemplate()` function in `emailService.ts`:

- Change colors, fonts, layout
- Add company logo or branding
- Modify metric labels or order
- Add additional data sections

### Change Email Sender

Modify environment variables:

```bash
EMAIL_FROM=reports@company.com
EMAIL_FROM_NAME=HR Analytics Team
```

## Testing

### Manual Trigger (Development)

From the main process, call:

```typescript
import { triggerDailySummaryEmails } from './dailyScheduler';

await triggerDailySummaryEmails();
```

Or use the IPC handler:

```typescript
window.electronAPI?.invoke('trigger-daily-summary-emails');
```

### Immediate Testing

Uncomment this line in `dailyScheduler.ts` to send emails immediately on app start:

```typescript
// sendDailySummaryEmails();
```

### Verify Configuration

1. Check console logs for initialization messages:
   ```
   [Email Service] Email service initialized successfully
   [Scheduler] Starting daily scheduler with cron expression: 0 6 * * *
   [Scheduler] Daily scheduler started successfully
   ```

2. Look for execution logs at scheduled time:
   ```
   [Scheduler] Starting daily summary email job
   [Scheduler] Found N employees with email addresses
   [Scheduler] Summary email sent to employee@example.com
   ```

## Troubleshooting

### Emails Not Sending

**Issue**: No emails received by employees

**Solutions**:
- Verify SMTP configuration is correct
- Check that employees have valid email addresses in database
- Review console logs for error messages
- Ensure there's activity data from the previous day
- Test with manual trigger

### Authentication Errors

**Issue**: "SMTP authentication failed"

**Solutions**:
- Verify username and password
- For Gmail, use App Password instead of account password
- Check email provider's security settings
- Verify IP whitelist (if applicable)

### Emails Going to Spam

**Issue**: Emails appear in spam/junk folder

**Solutions**:
- Add sender to contacts to whitelist
- Configure SPF/DKIM records if using custom domain
- Request email client to mark as "Not Spam"
- Use verified email address

### No Activity Data

**Issue**: Email shows zero metrics

**Solutions**:
- Ensure activity is being monitored
- Check that `employee_activity` table has recent records
- Verify employee was logged in/active yesterday
- Review activity logs for data collection issues

### Scheduler Not Running

**Issue**: No emails at scheduled time

**Solutions**:
- Check that app is running (not minimized to tray)
- Verify environment variables are set correctly
- Review console logs for initialization errors
- Manually trigger to test configuration
- Check system timezone matches cron expectations

## Database Schema

The feature uses these tables:

### employees
```sql
id (uuid)
email (text) -- Required for emails
first_name (text)
last_name (text)
```

### employee_activity
```sql
id (uuid)
employee_id (uuid)
timestamp (timestamptz)
active_time (int) -- seconds
productive_time (int) -- seconds
nonproductive_time (int) -- seconds
idle_time (int) -- seconds
away_time (int) -- seconds
activity_logs (jsonb) -- [{appName, durationSeconds}]
```

## Performance Considerations

- **Batch Processing**: Employees are processed sequentially to avoid overwhelming mail server
- **Error Handling**: Individual failures don't stop the entire batch
- **Timezone**: Scheduler uses UTC; adjust SUMMARY_EMAIL_TIME for your timezone
- **Load Time**: Email generation is lightweight; minimal impact on app performance

## Security Best Practices

1. **Store Credentials Securely**:
   - Use environment variables (never hardcode)
   - Use app-specific passwords for Gmail
   - Restrict SMTP user permissions

2. **Email Content**:
   - No sensitive data in email body (only metrics)
   - Links to secure dashboard (not implemented)
   - Professional template prevents phishing concerns

3. **Recipient Validation**:
   - Only send to employees with valid email addresses
   - Verify email format before sending
   - Log all email activities for audit trail

## Future Enhancements

Potential improvements:

1. **Recipient Customization**:
   - Per-employee send times
   - Opt-in/opt-out functionality
   - Department-based distribution

2. **Enhanced Reporting**:
   - Week/month summaries
   - Trend analysis
   - Performance comparisons
   - Goal tracking

3. **Advanced Features**:
   - Scheduled reports to managers/admins
   - Custom metrics and KPIs
   - Report branding/white-labeling
   - Multi-language support

4. **Integration**:
   - Slack notifications
   - Teams integration
   - Calendar event scheduling
   - Export to PDF/Excel

## Support

For issues or questions:
1. Check [EMAIL_SETUP.md](./EMAIL_SETUP.md) for provider-specific guidance
2. Review application logs for error messages
3. Test with manual trigger function
4. Verify environment configuration
