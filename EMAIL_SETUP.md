# Email Configuration for Daily Summary Reports

## Environment Variables

Add these to your `.env.local` or system environment variables to enable daily summary emails:

```bash
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Email Sender Info
EMAIL_FROM=your-email@gmail.com
EMAIL_FROM_NAME=Knockturn Employee Agent

# Scheduler Configuration (cron format)
# Default: "0 6 * * *" (Daily at 6:00 AM UTC)
SUMMARY_EMAIL_TIME=0 6 * * *
```

## Setting Up Gmail

1. **Enable 2-Step Verification** in your Google Account
2. **Generate App Password**:
   - Go to [Google Account](https://myaccount.google.com)
   - Navigate to Security → App passwords
   - Select Mail and Windows
   - Copy the generated password
3. **Use the app password** in `SMTP_PASS`

## Setting Up Other Email Providers

### Outlook/Office 365
```bash
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
```

### SendGrid
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Custom SMTP
Update the `SMTP_HOST` and `SMTP_PORT` according to your provider's specifications.

## Cron Schedule Examples

- `0 6 * * *` - Daily at 6:00 AM UTC
- `0 9 * * MON-FRI` - Weekdays at 9:00 AM UTC
- `0 18 * * *` - Daily at 6:00 PM UTC
- `0 6 * * 1` - Every Monday at 6:00 AM UTC

[Cron Format Reference](https://crontab.guru/)

## Testing the Configuration

The scheduler provides a manual trigger function for testing. You can call `triggerDailySummaryEmails()` from the main process to immediately send emails.

## Troubleshooting

### Emails Not Sending
- Check the application logs for error messages
- Verify SMTP credentials are correct
- Ensure employees have valid email addresses in the database
- Check if there's activity data for the previous day

### SMTP Authentication Failed
- Verify username/password
- For Gmail, ensure you're using an App Password, not your account password
- Check if your email provider has IP whitelisting enabled

### Emails Going to Spam
- Add the sender email to contacts
- Verify SPF/DKIM records if using a custom domain
- Request to mark as "Not Spam" in email client
